<?php

namespace App\Console\Commands;

use App\Models\MarketerPayoutBatch;
use App\Modules\Billing\Services\XenditPayoutService;
use App\Modules\Billing\Services\XenditPayoutWebhookService;
use App\Services\MarketerCommissionPayoutService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Recovers idempotent Xendit submit for stuck pending_submit batches and polls gateway
 * for submitted batches when webhooks are missing or incomplete.
 */
class ReconcileMarketerPayoutBatches extends Command
{
    protected $signature = 'marketing:reconcile-payout-batches';

    protected $description = 'Retry idempotent Xendit submit for pending_submit batches and poll status for submitted batches.';

    public function handle(
        XenditPayoutService $xendit,
        MarketerCommissionPayoutService $payouts,
        XenditPayoutWebhookService $payoutWebhooks,
    ): int {
        if (! $xendit->isConfigured()) {
            $this->info('Xendit is not configured; skipping payout reconciliation.');

            return self::SUCCESS;
        }

        if (! (bool) config('services.marketing_payout.reconcile_poll_enabled', true)) {
            $this->info('Marketing payout reconciliation polling is disabled.');

            return self::SUCCESS;
        }

        $pendingAfter = max(1, (int) config('services.marketing_payout.recover_pending_submit_after_minutes', 3));
        $submittedAfter = max(1, (int) config('services.marketing_payout.reconcile_submitted_poll_after_minutes', 30));
        $maxAttempts = max(1, (int) config('services.marketing_payout.max_submit_attempts', 8));

        $pendingCutoff = now()->subMinutes($pendingAfter);
        $submittedCutoff = now()->subMinutes($submittedAfter);

        $nPending = 0;
        $nSubmitted = 0;
        $nSkippedCapped = 0;

        foreach (MarketerPayoutBatch::query()
            ->where('status', MarketerPayoutBatch::STATUS_PENDING_SUBMIT)
            ->where('created_at', '<=', $pendingCutoff)
            ->where('submit_attempts', '<', $maxAttempts)
            ->orderBy('id')
            ->cursor() as $batch) {
            try {
                $payouts->submitBatchToXendit((int) $batch->id);
                $nPending++;
            } catch (Throwable $e) {
                Log::warning('Recover pending_submit marketer batch failed', [
                    'batch_id' => $batch->id,
                    'reference_id' => $batch->reference_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $cappedCount = MarketerPayoutBatch::query()
            ->where('status', MarketerPayoutBatch::STATUS_PENDING_SUBMIT)
            ->where('submit_attempts', '>=', $maxAttempts)
            ->count();
        if ($cappedCount > 0) {
            $nSkippedCapped = $cappedCount;
            Log::critical('Marketer payout batches stuck at submit-attempt cap; ops review required', [
                'count' => $cappedCount,
                'max_attempts' => $maxAttempts,
            ]);
        }

        foreach (MarketerPayoutBatch::query()
            ->where('status', MarketerPayoutBatch::STATUS_SUBMITTED)
            ->whereNotNull('xendit_payout_id')
            ->whereNotNull('submitted_at')
            ->where('submitted_at', '<=', $submittedCutoff)
            ->orderBy('id')
            ->cursor() as $batch) {
            try {
                $payoutWebhooks->reconcileSubmittedBatchFromApi($batch);
                $nSubmitted++;
            } catch (Throwable $e) {
                Log::warning('Reconcile submitted marketer batch from Xendit failed', [
                    'batch_id' => $batch->id,
                    'reference_id' => $batch->reference_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Reconciliation pass: attempted recovery for {$nPending} pending_submit batch(es), polled {$nSubmitted} submitted batch(es), {$nSkippedCapped} capped (>= {$maxAttempts} attempts).");

        return self::SUCCESS;
    }
}
