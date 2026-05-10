<?php

namespace App\Console\Commands;

use App\Models\MarketerPayoutBatch;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Surfaces marketer payout batches that may need ops attention (stuck states).
 */
class ReportStaleMarketerPayoutBatches extends Command
{
    protected $signature = 'marketing:report-stale-payout-batches';

    protected $description = 'Log warnings for marketer payout batches stuck in pending_submit or submitted too long.';

    public function handle(): int
    {
        $pendingHours = (int) config('services.marketing_payout.stale_pending_submit_hours', 72);
        $submittedHours = (int) config('services.marketing_payout.stale_submitted_hours', 168);

        $pendingCutoff = now()->subHours(max(1, $pendingHours));
        $submittedCutoff = now()->subHours(max(1, $submittedHours));

        $stalePending = MarketerPayoutBatch::query()
            ->where('status', MarketerPayoutBatch::STATUS_PENDING_SUBMIT)
            ->where('created_at', '<', $pendingCutoff)
            ->orderBy('id')
            ->get(['id', 'marketer_id', 'reference_id', 'total_amount', 'created_at']);

        foreach ($stalePending as $b) {
            Log::warning('Stale marketer payout batch: pending_submit (never submitted to Xendit?)', [
                'batch_id' => $b->id,
                'marketer_id' => $b->marketer_id,
                'reference_id' => $b->reference_id,
                'total_amount' => (float) $b->total_amount,
                'created_at' => $b->created_at?->toIso8601String(),
            ]);
            $this->warn("Stale pending_submit batch #{$b->id} ({$b->reference_id})");
        }

        $staleSubmitted = MarketerPayoutBatch::query()
            ->where('status', MarketerPayoutBatch::STATUS_SUBMITTED)
            ->whereNotNull('submitted_at')
            ->where('submitted_at', '<', $submittedCutoff)
            ->orderBy('id')
            ->get(['id', 'marketer_id', 'reference_id', 'xendit_payout_id', 'submitted_at']);

        foreach ($staleSubmitted as $b) {
            Log::warning('Stale marketer payout batch: submitted (no success/fail webhook yet?)', [
                'batch_id' => $b->id,
                'marketer_id' => $b->marketer_id,
                'reference_id' => $b->reference_id,
                'xendit_payout_id' => $b->xendit_payout_id,
                'submitted_at' => $b->submitted_at?->toIso8601String(),
            ]);
            $this->warn("Stale submitted batch #{$b->id} ({$b->reference_id})");
        }

        if ($stalePending->isEmpty() && $staleSubmitted->isEmpty()) {
            $this->info('No stale marketer payout batches.');
        }

        return self::SUCCESS;
    }
}
