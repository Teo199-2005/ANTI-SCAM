<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Referral funnel counts for admin/marketing dashboards (not commission tiers).
 *
 * @deprecated Tier-based subscription commissions (Silver/Gold/Platinum) are removed.
 */
class MarketerTierService
{
    /**
     * Distinct resort-owner organizations (tenants) with at least one paid, qualifying subscription invoice
     * attributed to this marketer. Used for referral funnel metrics only.
     */
    public function countConvertingClients(int $marketerId): int
    {
        $conversionSub = DB::table('subscription_invoices')
            ->select('marketer_id', 'tenant_id', DB::raw('MIN(paid_at) as first_paid'))
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereNotNull('marketer_id')
            ->whereNotNull('tenant_id')
            ->where(function ($q): void {
                $q->whereNull('plan')
                    ->orWhere(function ($q2): void {
                        $q2->where('plan', 'not like', '%_room_addon%')
                            ->where('plan', 'not like', '%signup_trial%');
                    });
            })
            ->groupBy('marketer_id', 'tenant_id');

        $row = DB::query()
            ->fromSub($conversionSub, 'conv')
            ->where('conv.marketer_id', $marketerId)
            ->selectRaw('COUNT(*) as c')
            ->first();

        return $row ? (int) $row->c : 0;
    }

    /**
     * Distinct resorts with at least one qualifying paid referral invoice (informational).
     */
    public function countDistinctReferredResorts(int $marketerId): int
    {
        $row = DB::table('subscription_invoices')
            ->where('marketer_id', $marketerId)
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereNotNull('resort_id')
            ->where(function ($q): void {
                $q->whereNull('plan')
                    ->orWhere(function ($q2): void {
                        $q2->where('plan', 'not like', '%_room_addon%')
                            ->where('plan', 'not like', '%signup_trial%');
                    });
            })
            ->selectRaw('COUNT(DISTINCT resort_id) as c')
            ->first();

        return $row ? (int) $row->c : 0;
    }
}
