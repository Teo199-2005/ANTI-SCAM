<?php

namespace App\Modules\Dashboard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\SubscriptionInvoice;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketingDashboardController extends Controller
{
    use ApiResponseTrait;

    public function stats(Request $request)
    {
        $marketerId = $request->user()->id;

        $totalCommissions = Commission::where('marketer_id', $marketerId)->sum('commission_amount');
        $pendingCommissions = Commission::where('marketer_id', $marketerId)->where('status', 'pending')->sum('commission_amount');
        $releasedCommissions = Commission::where('marketer_id', $marketerId)->where('status', 'released')->sum('commission_amount');
        $resortCount = DB::table('marketer_resorts')->where('marketer_id', $marketerId)->count();

        $user = $request->user();
        $frontend = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $code = $user->referral_code;
        $shareRegister = $code !== null && $code !== '' ? "{$frontend}/register?ref={$code}" : null;
        $subscribeHint = $code !== null && $code !== ''
            ? "Owners subscribed with code {$code} unlock ₱1,500/mo pricing where referral discounts apply."
            : null;

        return $this->successResponse([
            'totalCommissions'   => (float) $totalCommissions,
            'pendingCommissions' => (float) $pendingCommissions,
            'releasedCommissions' => (float) $releasedCommissions,
            'assignedResorts'    => $resortCount,
            'referral_code' => $code,
            'referral_share_register_url' => $shareRegister,
            'referral_subscribe_hint' => $subscribeHint,
        ], 'Marketing stats');
    }

    public function assignedResorts(Request $request)
    {
        $marketerId = $request->user()->id;

        $resorts = DB::table('marketer_resorts')
            ->where('marketer_resorts.marketer_id', $marketerId)
            ->join('resorts', 'resorts.id', '=', 'marketer_resorts.resort_id')
            ->select('resorts.id', 'resorts.name', 'resorts.address', 'resorts.is_publicly_listed', 'resorts.is_vip')
            ->get();

        return $this->successResponse($resorts, 'Assigned resorts fetched');
    }

    public function commissions(Request $request)
    {
        $marketerId = $request->user()->id;
        $perPage    = (int) $request->integer('perPage', 12);

        $commissions = Commission::with(['resort:id,name', 'releases'])
            ->where('marketer_id', $marketerId)
            ->latest()
            ->paginate($perPage);

        return $this->successResponse($commissions, 'Commissions fetched');
    }

    public function releaseHistory(Request $request)
    {
        $marketerId = $request->user()->id;
        $perPage    = (int) $request->integer('perPage', 12);

        $releases = CommissionRelease::with(['commission.resort:id,name', 'releasedByUser:id,name'])
            ->whereHas('commission', fn ($q) => $q->where('marketer_id', $marketerId))
            ->latest('released_at')
            ->paginate($perPage);

        return $this->successResponse($releases, 'Release history fetched');
    }

    /** Year-scoped analytics for the authenticated marketer only. */
    public function analytics(Request $request)
    {
        if ($request->user()->role !== 'marketing') {
            return $this->errorResponse('Marketing analytics is only available for marketing accounts.', null, 403);
        }

        $year = (int) $request->integer('year', now()->year);
        $year = min(max($year, 2020), now()->year + 1);

        $marketerId = $request->user()->id;
        $periodStart = sprintf('%04d-01', $year);
        $periodEnd = sprintf('%04d-12', $year);

        $monthBuckets = [];
        for ($m = 1; $m <= 12; $m++) {
            $p = sprintf('%04d-%02d', $year, $m);
            $monthBuckets[$p] = [
                'period' => $p,
                'commission_pending' => 0.0,
                'commission_released' => 0.0,
                'referral_payment_count' => 0,
                'referral_payment_volume' => 0.0,
            ];
        }

        $commissionsYtd = Commission::query()
            ->where('marketer_id', $marketerId)
            ->whereBetween('period', [$periodStart, $periodEnd])
            ->with(['resort:id,name'])
            ->get();

        foreach ($commissionsYtd as $row) {
            if (! isset($monthBuckets[$row->period])) {
                continue;
            }
            $amt = (float) $row->commission_amount;
            if ($row->status === 'released') {
                $monthBuckets[$row->period]['commission_released'] += $amt;
            } else {
                $monthBuckets[$row->period]['commission_pending'] += $amt;
            }
        }

        $referralInvoices = SubscriptionInvoice::withoutGlobalScopes()
            ->where('marketer_id', $marketerId)
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereYear('paid_at', $year)
            ->get(['paid_at', 'amount']);

        foreach ($referralInvoices as $inv) {
            $p = $inv->paid_at->format('Y-m');
            if (! isset($monthBuckets[$p])) {
                continue;
            }
            $monthBuckets[$p]['referral_payment_count']++;
            $monthBuckets[$p]['referral_payment_volume'] += (float) $inv->amount;
        }

        $byResort = $commissionsYtd->groupBy('resort_id')->map(function ($group) {
            $first = $group->first();

            return [
                'resort_id' => (int) $first->resort_id,
                'resort_name' => $first->resort?->name ?? 'Resort',
                'commission_total' => round((float) $group->sum('commission_amount'), 2),
                'commission_pending' => round((float) $group->where('status', 'pending')->sum('commission_amount'), 2),
                'commission_released' => round((float) $group->where('status', 'released')->sum('commission_amount'), 2),
            ];
        })->values()->all();

        $totals = [
            'commission_pending_ytd' => round((float) $commissionsYtd->where('status', 'pending')->sum('commission_amount'), 2),
            'commission_released_ytd' => round((float) $commissionsYtd->where('status', 'released')->sum('commission_amount'), 2),
            'referral_subscription_count_ytd' => $referralInvoices->count(),
            'referral_subscription_volume_ytd' => round((float) $referralInvoices->sum('amount'), 2),
        ];

        return $this->successResponse([
            'year' => $year,
            'monthly' => array_values($monthBuckets),
            'by_resort' => $byResort,
            'totals' => $totals,
        ], 'Marketing analytics');
    }
}
