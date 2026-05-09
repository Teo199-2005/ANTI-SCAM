<?php

namespace App\Modules\Billing\Services;

use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\MarketerPayoutBatch;
use App\Models\XenditWebhookEvent;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class XenditPayoutWebhookService
{
    public function __construct(private readonly XenditWebhookService $signatureVerifier) {}

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

            $xenditAmount = isset($data['amount']) ? round((float) $data['amount'], 2) : null;
            if ($xenditAmount !== null && abs($xenditAmount - (float) $batch->total_amount) > 0.009) {
                $this->unlockBatch($batch, 'Xendit amount does not match batch total (webhook rejected).');

                XenditWebhookEvent::query()->create([
                    'event_id' => $webhookEventId,
                    'event_type' => $event.'_rejected_amount',
                    'invoice_id' => (string) ($data['id'] ?? ''),
                    'processed_at' => now(),
                ]);

                return;
            }

            $items = $batch->items()->with('commission')->lockForUpdate()->get();

            if ($items->isEmpty()) {
                $this->unlockBatch($batch, 'Batch has no line items; cannot complete payout.');

                XenditWebhookEvent::query()->create([
                    'event_id' => $webhookEventId,
                    'event_type' => $event.'_rejected_empty',
                    'invoice_id' => (string) ($data['id'] ?? ''),
                    'processed_at' => now(),
                ]);

                return;
            }

            foreach ($items as $item) {
                $commission = $item->commission;
                if (! $commission || $commission->status !== 'pending') {
                    $this->unlockBatch($batch, 'Commission state changed before payout completion; unlocked for manual review.');

                    XenditWebhookEvent::query()->create([
                        'event_id' => $webhookEventId,
                        'event_type' => $event.'_rejected_state',
                        'invoice_id' => (string) ($data['id'] ?? ''),
                        'processed_at' => now(),
                    ]);

                    return;
                }
                $gross = round((float) $commission->commission_amount, 2);
                $net = round((float) $item->amount, 2);
                if ($net > $gross + 0.009 || $net < -0.009) {
                    $this->unlockBatch($batch, 'Payout line exceeds gross commission; unlocked for manual review.');

                    XenditWebhookEvent::query()->create([
                        'event_id' => $webhookEventId,
                        'event_type' => $event.'_rejected_drift',
                        'invoice_id' => (string) ($data['id'] ?? ''),
                        'processed_at' => now(),
                    ]);

                    return;
                }
            }

            foreach ($items as $item) {
                $commission = $item->commission;
                if (! $commission) {
                    continue;
                }
                CommissionRelease::query()->create([
                    'commission_id' => $commission->id,
                    'released_by' => null,
                    'amount' => $item->amount,
                    'notes' => 'Xendit GCash payout '.$batch->reference_id.' (net after withholding)',
                    'released_at' => now(),
                    'release_source' => CommissionRelease::SOURCE_XENDIT,
                    'payout_batch_id' => $batch->id,
                ]);

                $commission->update([
                    'status' => 'released',
                ]);
            }

            $batch->update([
                'status' => MarketerPayoutBatch::STATUS_SUCCEEDED,
                'xendit_payout_id' => (string) ($data['id'] ?? $batch->xendit_payout_id),
                'completed_at' => now(),
                'failure_message' => null,
            ]);

            XenditWebhookEvent::query()->create([
                'event_id' => $webhookEventId,
                'event_type' => $event,
                'invoice_id' => (string) ($data['id'] ?? ''),
                'processed_at' => now(),
            ]);
        });
    }

    private function unlockBatch(MarketerPayoutBatch $batch, string $reason): void
    {
        Commission::query()->where('payout_batch_id', $batch->id)->update(['payout_batch_id' => null]);
        $batch->items()->delete();
        $batch->update([
            'status' => MarketerPayoutBatch::STATUS_FAILED,
            'failure_message' => mb_substr($reason, 0, 2000),
            'completed_at' => now(),
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

            Commission::query()->where('payout_batch_id', $batch->id)->update(['payout_batch_id' => null]);
            $batch->items()->delete();
            $batch->update([
                'status' => MarketerPayoutBatch::STATUS_FAILED,
                'failure_message' => mb_substr($reason, 0, 2000),
                'completed_at' => now(),
            ]);

            XenditWebhookEvent::query()->create([
                'event_id' => $webhookEventId,
                'event_type' => $event,
                'invoice_id' => (string) ($data['id'] ?? ''),
                'processed_at' => now(),
            ]);
        });
    }
}
