<?php

namespace App\Services;

use App\Models\Commission;
use App\Models\SubscriptionInvoice;

/**
 * @deprecated Replaced by {@see BookingReferralCommissionService} (flat PHP per paid online booking).
 */
class SubscriptionReferralCommissionService
{
    public function __construct(
        private readonly MarketerTierService $marketerTiers,
    ) {}

    /**
     * Credit pending commission when a subscription invoice (with marketer) is paid.
     * Invoice must already be persisted with status=paid so converting-client count includes this tenant.
     */
    public function creditFromPaidMonthlyInvoice(SubscriptionInvoice $invoice): void
    {
        if (! $invoice->marketer_id) {
            return;
        }

        $plan = (string) $invoice->plan;
        if (str_contains($plan, '_room_addon')) {
            return;
        }

        $period = $invoice->billing_cycle_start
            ? $invoice->billing_cycle_start->format('Y-m')
            : now()->format('Y-m');

        $marketerId = (int) $invoice->marketer_id;
        $count = $this->marketerTiers->countConvertingClients($marketerId);
        $tier = $this->marketerTiers->resolveTier($count);
        if ($tier === null) {
            return;
        }

        $payout = (float) $tier['per_payment_php'];
        if ($payout <= 0) {
            return;
        }

        $commission = Commission::query()->firstOrNew([
            'marketer_id' => $marketerId,
            'resort_id' => $invoice->resort_id,
            'period' => $period,
        ]);

        $commission->gross_bookings = (float) $commission->gross_bookings + (float) $invoice->amount;
        $commission->commission_amount = (float) $commission->commission_amount + $payout;
        $commission->commission_rate = 0;
        $commission->marketer_tier = (string) $tier['tier_key'];
        $commission->unit_commission_php = $payout;
        $commission->status = 'pending';
        $commission->save();
    }
}
