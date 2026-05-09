<?php

namespace App\Services;

use App\Models\Commission;
use App\Models\SubscriptionInvoice;
use App\Models\SystemSetting;

class SubscriptionReferralCommissionService
{
    /** Credit pending commission when a monthly subscription invoice (with marketer) is paid. */
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

        $payout = (float) SystemSetting::getValue('referral_subscription_commission', '250');
        if ($payout <= 0) {
            return;
        }

        $commission = Commission::query()->firstOrNew([
            'marketer_id' => $invoice->marketer_id,
            'resort_id' => $invoice->resort_id,
            'period' => $period,
        ]);

        $commission->gross_bookings = (float) $commission->gross_bookings + (float) $invoice->amount;
        $commission->commission_amount = (float) $commission->commission_amount + $payout;
        $commission->commission_rate = 0;
        $commission->status = 'pending';
        $commission->save();
    }
}
