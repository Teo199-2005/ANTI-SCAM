<?php

namespace App\Modules\Billing\Services;

use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\MarketerPayoutBatch;
use App\Models\XenditWebhookEvent;

/**
 * Completes local commission releases when Xendit confirms payout success.
 * Call only inside an outer DB transaction after amount verification and dedupe checks.
 */
class MarketerPayoutSuccessFinalizer
{
    /**
     * @param  array<string, mixed>  $data  Gateway payload fragment (for xendit payout id fallback).
     */
    public function finalize(
        MarketerPayoutBatch $batch,
        float $verifiedAmount,
        string $webhookEventId,
        string $eventType,
        array $data,
    ): void {
        // Only LIVE items count. A previously soft-cancelled item belongs to a failed prior
        // attempt and must not be re-released.
        $items = $batch->items()
            ->whereNull('cancelled_at')
            ->with('commission')
            ->lockForUpdate()
            ->get();

        if ($items->isEmpty()) {
            throw new \RuntimeException('Batch has no live line items; cannot complete payout.');
        }

        foreach ($items as $item) {
            $commission = $item->commission;
            if (! $commission || $commission->status !== 'pending') {
                throw new \RuntimeException('Commission state changed before payout completion.');
            }
            // Defensive: a parallel admin manual-release could have detached the commission from
            // this batch. Refuse to release if the commission isn't currently bound to us.
            if ((int) ($commission->payout_batch_id ?? 0) !== (int) $batch->id) {
                throw new \RuntimeException(
                    'Commission '.$commission->id.' is no longer bound to batch '.$batch->id.'; refusing to release.'
                );
            }
            // Prefer the snapshot taken at batch-create time (immune to later admin edits of
            // commission_amount); fall back to live commission_amount for legacy items.
            $gross = $item->gross_commission_snapshot !== null
                ? round((float) $item->gross_commission_snapshot, 2)
                : round((float) $commission->commission_amount, 2);
            $net = round((float) $item->amount, 2);
            if ($net > $gross + 0.009 || $net < -0.009) {
                throw new \RuntimeException('Payout line exceeds gross commission.');
            }
        }

        if (abs($verifiedAmount - (float) $batch->total_amount) > 0.009) {
            throw new \RuntimeException('Verified amount does not match batch total.');
        }

        $xenditId = (string) ($data['id'] ?? $batch->xendit_payout_id ?? '');

        foreach ($items as $item) {
            $commission = $item->commission;
            if (! $commission) {
                continue;
            }
            CommissionRelease::query()->create([
                'commission_id' => $commission->id,
                'released_by' => null,
                'amount' => $item->amount,
                'notes' => 'Xendit bank payout '.$batch->reference_id.' (net after withholding)',
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
            'xendit_payout_id' => $xenditId !== '' ? $xenditId : $batch->xendit_payout_id,
            'completed_at' => now(),
            'failure_message' => null,
        ]);

        XenditWebhookEvent::query()->create([
            'event_id' => $webhookEventId,
            'event_type' => $eventType,
            'invoice_id' => $xenditId,
            'processed_at' => now(),
        ]);
    }
}
