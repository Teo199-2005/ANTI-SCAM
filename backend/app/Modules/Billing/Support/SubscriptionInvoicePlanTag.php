<?php

namespace App\Modules\Billing\Support;

final class SubscriptionInvoicePlanTag
{
    public static function baseMonthly(string $plan, int $durationMonths, bool $setupRecurring): string
    {
        $durationMonths = in_array($durationMonths, [1, 3, 6, 12], true) ? $durationMonths : 1;
        $suffix = $setupRecurring ? '_rec' : '';

        return sprintf('%s_m%d_b0%s', $plan, $durationMonths, $suffix);
    }

    public static function requestsRecurringSetup(string $invoicePlan): bool
    {
        return str_ends_with($invoicePlan, '_rec');
    }

    /**
     * Months credited when a base (non-addon) subscription invoice is paid.
     */
    public static function creditedMonthsFromPlan(string $invoicePlan): int
    {
        if (preg_match('/_m(\d+)_fmf$/', $invoicePlan, $m) === 1) {
            return max(1, (int) $m[1]);
        }

        if (preg_match('/_m(\d+)_b0(?:_rec)?$/', $invoicePlan, $m) === 1) {
            return max(1, (int) $m[1]);
        }

        if (preg_match('/_m(\d+)_b(\d+)$/', $invoicePlan, $m) === 1) {
            return max(1, (int) $m[1] + (int) $m[2]);
        }

        return 1;
    }
}
