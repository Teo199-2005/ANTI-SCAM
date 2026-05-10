<?php

namespace App\Modules\Billing\Services;

use App\Models\Commission;
use App\Models\MarketerPayoutBatch;
use App\Models\XenditWebhookEvent;
use App\Modules\Audit\Services\AuditLogService;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class XenditPayoutWebhookService
{
    public function __construct(
        private readonly XenditWebhookService $signatureVerifier,
        private readonly XenditPayoutService $xenditPayout,
        private readonly MarketerPayoutSuccessFinalizer $successFinalizer,
        private readonly ?AuditLogService $audits = null,
    ) {}

    public function verifySignature(string $signature): void
    {
        $this->signatureVerifier->verifySignature($signature);
    }

    public function handle(array $payload): void
    {
        $event = (string) ($payload['event'] ?? '');
        $data = Arr::get($payload, 'data', []);
        if (! is_array($data)) {
            $data = [];
        }

        if ($data === [] && isset($payload['reference_id'])) {
            $data = $payload;
        }

        $referenceId = (string) ($data['reference_id'] ?? $payload['reference_id'] ?? '');
        if ($referenceId === '' || ! str_starts_with($referenceId, 'ASP-M')) {
            return;
        }

        $webhookEventId = (string) ($payload['id'] ?? '');
        if ($webhookEventId === '') {
            $webhookEventId = 'payout-'.hash('sha256', $event.'|'.$referenceId.'|'.json_encode($payload));
        }

        $statusUpper = strtoupper((string) ($data['status'] ?? ''));

        if ($event === 'payout.succeeded' || str_contains($event, 'succeeded') || $statusUpper === 'SUCCEEDED') {
            $this->handleSucceeded($webhookEventId, $event, $data, $referenceId);

            return;
        }

        if ($event === 'payout.failed' || str_contains($event, 'failed') || $statusUpper === 'FAILED') {
            $this->handleFailed($webhookEventId, $event, $data, $referenceId);

            return;
        }
    }

    /**
     * Poll Xendit for a submitted batch and complete or fail it if the gateway state changed
     * (safety net when webhooks are delayed or omit fields).
     */
    public function reconcileSubmittedBatchFromApi(MarketerPayoutBatch $batch): void
    {
        $payoutId = (string) ($batch->xendit_payout_id ?? '');
        if ($payoutId === '' || ! $this->xenditPayout->isConfigured()) {
            return;
        }

        $remote = $this->xenditPayout->fetchPayoutById($payoutId);
        if (! is_array($remote)) {
            return;
        }

        $remoteStatus = strtoupper((string) ($remote['status'] ?? ''));

        DB::transaction(function () use ($batch, $remote, $remoteStatus, $payoutId): void {
            $fresh = MarketerPayoutBatch::query()->whereKey($batch->id)->lockForUpdate()->first();
            if (! $fresh || $fresh->status !== MarketerPayoutBatch::STATUS_SUBMITTED) {
                return;
            }

            $eventId = 'reconcile-poll-succeeded-'.$fresh->id;
            if ($remoteStatus === 'SUCCEEDED') {
                if (XenditWebhookEvent::query()->where('event_id', $eventId)->lockForUpdate()->exists()) {
                    return;
                }

                $amount = isset($remote['amount']) ? round((float) $remote['amount'], 2) : null;
                if ($amount === null) {
                    Log::info('Xendit poll: SUCCEEDED without amount; using batch total', [
                        'batch_id' => $fresh->id,
                        'reference_id' => $fresh->reference_id,
                    ]);
                    $amount = round((float) $fresh->total_amount, 2);
                }

                if (abs($amount - (float) $fresh->total_amount) > 0.009) {
                    Log::critical('Xendit poll: succeeded amount does not match batch; manual review required', [
                        'batch_id' => $fresh->id,
                        'reference_id' => $fresh->reference_id,
                        'batch_net' => (float) $fresh->total_amount,
                        'xendit_amount' => $amount,
                    ]);

                    return;
                }

                try {
                    $this->successFinalizer->finalize(
                        $fresh,
                        $amount,
                        $eventId,
                        'payout.reconciled_poll',
                        ['id' => $payoutId] + $remote,
                    );
                    $this->audit('marketer_payout_batch_succeeded', $fresh->id, ['source' => 'reconcile_poll']);
                } catch (Throwable $e) {
                    Log::error('Marketer payout poll finalize failed', [
                        'batch_id' => $fresh->id,
                        'error' => $e->getMessage(),
                    ]);
                    $this->markBatchFailed($fresh, 'Poll finalize failed: '.$e->getMessage());

                    XenditWebhookEvent::query()->create([
                        'event_id' => $eventId.'_rejected',
                        'event_type' => 'payout.reconciled_poll_rejected',
                        'invoice_id' => $payoutId,
                        'processed_at' => now(),
                    ]);
                }

                return;
            }

            if ($remoteStatus === 'FAILED' || $remoteStatus === 'CANCELLED' || $remoteStatus === 'REVERSED') {
                $pollFailId = 'reconcile-poll-failed-'.$fresh->id.'-'.$remoteStatus;
                if (XenditWebhookEvent::query()->where('event_id', $pollFailId)->lockForUpdate()->exists()) {
                    return;
                }

                $reason = (string) ($remote['failure_code'] ?? $remote['message'] ?? 'Payout '.$remoteStatus.' (via API poll)');
                $this->markBatchFailed($fresh, $reason);

                XenditWebhookEvent::query()->create([
                    'event_id' => $pollFailId,
                    'event_type' => 'payout.reconciled_poll_failed',
                    'invoice_id' => $payoutId,
                    'processed_at' => now(),
                ]);
            }
        });
    }

    private function handleSucceeded(string $webhookEventId, string $event, array $data, string $referenceId): void
    {
        DB::transaction(function () use ($webhookEventId, $event, $data, $referenceId): void {
            if (XenditWebhookEvent::query()->where('event_id', $webhookEventId)->lockForUpdate()->exists()) {
                return;
            }

            $batch = MarketerPayoutBatch::query()
                ->where('reference_id', $referenceId)
                ->lockForUpdate()
                ->first();

            if (! $batch) {
                return;
            }

            if ($batch->status === MarketerPayoutBatch::STATUS_SUCCEEDED) {
                XenditWebhookEvent::query()->create([
                    'event_id' => $webhookEventId,
                    'event_type' => $event,
                    'invoice_id' => (string) ($data['id'] ?? ''),
                    'processed_at' => now(),
                ]);

                return;
            }

            if (! in_array($batch->status, [MarketerPayoutBatch::STATUS_SUBMITTED, MarketerPayoutBatch::STATUS_PENDING_SUBMIT], true)) {
                return;
            }

            $xenditAmount = $this->resolveVerifiedPayoutAmount($data, $batch);

            if ($xenditAmount === null) {
                Log::critical('Xendit payout webhook succeeded but amount could not be verified; awaiting poll or manual review', [
                    'reference_id' => $referenceId,
                    'batch_id' => $batch->id,
                    'batch_net' => (float) $batch->total_amount,
                    'data_id' => $data['id'] ?? null,
                ]);

                return;
            }

            if (abs($xenditAmount - (float) $batch->total_amount) > 0.009) {
                $this->markBatchFailed($batch, 'Xendit amount does not match batch total (webhook rejected).');

                XenditWebhookEvent::query()->create([
                    'event_id' => $webhookEventId,
                    'event_type' => $event.'_rejected_amount',
                    'invoice_id' => (string) ($data['id'] ?? ''),
                    'processed_at' => now(),
                ]);

                return;
            }

            try {
                $this->successFinalizer->finalize($batch, $xenditAmount, $webhookEventId, $event, $data);
                $this->audit('marketer_payout_batch_succeeded', $batch->id, ['source' => 'webhook', 'event' => $event]);
            } catch (Throwable $e) {
                $this->markBatchFailed($batch, $e->getMessage());

                XenditWebhookEvent::query()->create([
                    'event_id' => $webhookEventId,
                    'event_type' => $event.'_rejected_finalize',
                    'invoice_id' => (string) ($data['id'] ?? ''),
                    'processed_at' => now(),
                ]);
            }
        });
    }

    /**
     * Resolve payout amount: webhook body, then GET /v2/payouts/{id}, then batch total only if API reports SUCCEEDED without amount.
     */
    private function resolveVerifiedPayoutAmount(array $data, MarketerPayoutBatch $batch): ?float
    {
        if (isset($data['amount'])) {
            return round((float) $data['amount'], 2);
        }

        $payoutId = (string) ($data['id'] ?? $batch->xendit_payout_id ?? '');
        if ($payoutId !== '' && $this->xenditPayout->isConfigured()) {
            $remote = $this->xenditPayout->fetchPayoutById($payoutId);
            if (is_array($remote) && isset($remote['amount'])) {
                Log::info('Xendit payout amount resolved via API (webhook omitted amount)', [
                    'reference_id' => $batch->reference_id,
                    'batch_id' => $batch->id,
                    'payout_id' => $payoutId,
                ]);

                return round((float) $remote['amount'], 2);
            }

            if (is_array($remote) && strtoupper((string) ($remote['status'] ?? '')) === 'SUCCEEDED') {
                Log::info('Xendit payout API SUCCEEDED without amount field; using batch total', [
                    'reference_id' => $batch->reference_id,
                    'batch_id' => $batch->id,
                ]);

                return round((float) $batch->total_amount, 2);
            }
        }

        return null;
    }

    /**
     * Mark a batch as failed while PRESERVING line items as a forensic record.
     * Items are soft-cancelled (cancelled_at set), commissions are unlocked for future re-batching.
     */
    private function markBatchFailed(MarketerPayoutBatch $batch, string $reason): void
    {
        Commission::query()->where('payout_batch_id', $batch->id)->update(['payout_batch_id' => null]);
        $batch->items()->whereNull('cancelled_at')->update(['cancelled_at' => now()]);
        $batch->update([
            'status' => MarketerPayoutBatch::STATUS_FAILED,
            'failure_message' => mb_substr($reason, 0, 2000),
            'completed_at' => now(),
        ]);

        $this->audit('marketer_payout_batch_failed', $batch->id, [
            'reference_id' => $batch->reference_id,
            'reason' => mb_substr($reason, 0, 500),
        ]);
    }

    private function handleFailed(string $webhookEventId, string $event, array $data, string $referenceId): void
    {
        DB::transaction(function () use ($webhookEventId, $event, $data, $referenceId): void {
            if (XenditWebhookEvent::query()->where('event_id', $webhookEventId)->lockForUpdate()->exists()) {
                return;
            }

            $batch = MarketerPayoutBatch::query()
                ->where('reference_id', $referenceId)
                ->lockForUpdate()
                ->first();

            if (! $batch) {
                return;
            }

            if ($batch->status === MarketerPayoutBatch::STATUS_SUCCEEDED) {
                XenditWebhookEvent::query()->create([
                    'event_id' => $webhookEventId,
                    'event_type' => $event,
                    'invoice_id' => (string) ($data['id'] ?? ''),
                    'processed_at' => now(),
                ]);

                return;
            }

            $reason = (string) ($data['failure_code'] ?? $data['message'] ?? 'Payout failed');
            $this->markBatchFailed($batch, $reason);

            XenditWebhookEvent::query()->create([
                'event_id' => $webhookEventId,
                'event_type' => $event,
                'invoice_id' => (string) ($data['id'] ?? ''),
                'processed_at' => now(),
            ]);
        });
    }

    private function audit(string $action, int $batchId, ?array $newValues): void
    {
        if ($this->audits === null) {
            return;
        }
        try {
            $this->audits->log($action, 'marketer_payout_batch', $batchId, null, $newValues);
        } catch (Throwable $e) {
            Log::warning('Audit log failed for '.$action, ['batch_id' => $batchId, 'error' => $e->getMessage()]);
        }
    }
}
