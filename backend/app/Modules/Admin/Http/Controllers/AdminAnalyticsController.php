<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Resort;
use App\Support\QueryDateParts;
use App\Support\CacheSafe;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $resortId   = $request->filled('resort_id')   ? (int) $request->input('resort_id')   : null;
        $year       = (int) $request->input('year', now()->year);
        $month      = $request->filled('month')       ? (int) $request->input('month')       : null;
        $minRevenue = $request->filled('min_revenue') ? (float) $request->input('min_revenue') : null;
        $maxRevenue = $request->filled('max_revenue') ? (float) $request->input('max_revenue') : null;

        $cacheKey = "dashboard:admin_analytics:{$resortId}:{$year}:{$month}:{$minRevenue}:{$maxRevenue}";

        $payload = CacheSafe::remember($cacheKey, now()->addSeconds(60), function () use (
            $resortId, $year, $month, $minRevenue, $maxRevenue
        ) {
            // ── Base scoped query builder ───────────────────────────────────────
            $base = Reservation::withoutGlobalScopes()
                ->whereYear('created_at', $year)
                ->when($month,      fn ($q) => $q->whereMonth('created_at', $month))
                ->when($resortId,   fn ($q) => $q->where('resort_id', $resortId))
                ->when($minRevenue !== null, fn ($q) => $q->where('reservation_fee', '>=', $minRevenue))
                ->when($maxRevenue !== null, fn ($q) => $q->where('reservation_fee', '<=', $maxRevenue));

            // ── Summary KPIs ────────────────────────────────────────────────────
            $totalCount     = (clone $base)->count();
            $confirmedCount = (clone $base)->where('status', 'confirmed')->count();
            $cancelledCount = (clone $base)->where('status', 'cancelled')->count();
            $pendingCount   = (clone $base)->where('status', 'pending_payment')->count();
            $totalRevenue   = (float) (clone $base)->where('status', 'confirmed')->sum('reservation_fee');
            $avgValue       = $confirmedCount > 0 ? round($totalRevenue / $confirmedCount, 2) : 0;

            // ── Status breakdown ────────────────────────────────────────────────
            $statusRows = (clone $base)
                ->select('status', DB::raw('COUNT(*) as count'))
                ->groupBy('status')
                ->get();

            $statusBreakdown = [];
            foreach ($statusRows as $row) {
                $statusBreakdown[$row->status] = (int) $row->count;
            }

            // ── Daily breakdown (last 30 days, or entire month if month filter) ─
            $dailyBase = clone $base;
            if (!$month) {
                $dailyBase = $dailyBase->whereDate('created_at', '>=', now()->subDays(29)->toDateString());
            }
            $dailyRows = $dailyBase
                ->selectRaw("
                    DATE(created_at) as day,
                    COUNT(*) as reservations_count,
                    SUM(CASE WHEN status = 'confirmed' THEN reservation_fee ELSE 0 END) as revenue
                ")
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('day')
                ->get();

            // ── Monthly summary (all 12 months for the selected year) ───────────
            $monthNumExpr = QueryDateParts::monthNumberExpression();
            $monthGrpExpr = QueryDateParts::monthNumberGroupExpression();
            $monthlyRows = (clone $base)
                ->selectRaw("
                    {$monthNumExpr} as month_num,
                    COUNT(*) as reservations_count,
                    SUM(CASE WHEN status = 'confirmed' THEN reservation_fee ELSE 0 END) as revenue,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
                ")
                ->groupBy(DB::raw($monthGrpExpr))
                ->orderBy('month_num')
                ->get();

            // Fill all 12 months so chart always has complete data
            $monthlyMap = [];
            foreach ($monthlyRows as $row) {
                $monthlyMap[(int) $row->month_num] = [
                    'month'             => (int) $row->month_num,
                    'reservationsCount' => (int) $row->reservations_count,
                    'revenue'           => (float) $row->revenue,
                    'cancelledCount'    => (int) $row->cancelled_count,
                ];
            }
            $monthly = [];
            for ($m = 1; $m <= 12; $m++) {
                $monthly[] = $monthlyMap[$m] ?? [
                    'month'             => $m,
                    'reservationsCount' => 0,
                    'revenue'           => 0.0,
                    'cancelledCount'    => 0,
                ];
            }

            // ── Top 5 resorts by revenue ────────────────────────────────────────
            $topByRevenue = Reservation::withoutGlobalScopes()
                ->whereYear('created_at', $year)
                ->when($month,      fn ($q) => $q->whereMonth('created_at', $month))
                ->when($resortId,   fn ($q) => $q->where('resort_id', $resortId))
                ->when($minRevenue !== null, fn ($q) => $q->where('reservation_fee', '>=', $minRevenue))
                ->when($maxRevenue !== null, fn ($q) => $q->where('reservation_fee', '<=', $maxRevenue))
                ->where('status', 'confirmed')
                ->select('resort_id', DB::raw('SUM(reservation_fee) as total_revenue'), DB::raw('COUNT(*) as total_count'))
                ->groupBy('resort_id')
                ->orderByDesc('total_revenue')
                ->limit(5)
                ->get();

            $resortIds   = $topByRevenue->pluck('resort_id')->filter()->unique()->values();
            $resortNames = Resort::withoutGlobalScopes()
                ->whereIn('id', $resortIds)
                ->pluck('name', 'id');

            $topResortsByRevenue = $topByRevenue->map(fn ($r) => [
                'resort_id' => $r->resort_id,
                'name'      => $resortNames[$r->resort_id] ?? 'Unknown',
                'revenue'   => (float) $r->total_revenue,
                'count'     => (int) $r->total_count,
            ])->values();

            // ── Top 5 resorts by total booking count ────────────────────────────
            $topByCount = Reservation::withoutGlobalScopes()
                ->whereYear('created_at', $year)
                ->when($month,      fn ($q) => $q->whereMonth('created_at', $month))
                ->when($resortId,   fn ($q) => $q->where('resort_id', $resortId))
                ->when($minRevenue !== null, fn ($q) => $q->where('reservation_fee', '>=', $minRevenue))
                ->when($maxRevenue !== null, fn ($q) => $q->where('reservation_fee', '<=', $maxRevenue))
                ->select('resort_id', DB::raw('COUNT(*) as total_count'), DB::raw('SUM(CASE WHEN status = \'confirmed\' THEN reservation_fee ELSE 0 END) as confirmed_revenue'))
                ->groupBy('resort_id')
                ->orderByDesc('total_count')
                ->limit(5)
                ->get();

            $countResortIds   = $topByCount->pluck('resort_id')->filter()->unique()->values();
            $allNeededIds     = $resortIds->merge($countResortIds)->unique()->values();
            $allResortNames   = Resort::withoutGlobalScopes()->whereIn('id', $allNeededIds)->pluck('name', 'id');

            $topResortsByCount = $topByCount->map(fn ($r) => [
                'resort_id'        => $r->resort_id,
                'name'             => $allResortNames[$r->resort_id] ?? 'Unknown',
                'count'            => (int) $r->total_count,
                'confirmedRevenue' => (float) $r->confirmed_revenue,
            ])->values();

            // ── Resort list for filter dropdown ─────────────────────────────────
            $resorts = Resort::withoutGlobalScopes()
                ->select('id', 'name')
                ->orderBy('name')
                ->get()
                ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])
                ->values();

            return [
                'summary' => [
                    'totalCount'       => $totalCount,
                    'confirmedCount'   => $confirmedCount,
                    'cancelledCount'   => $cancelledCount,
                    'pendingCount'     => $pendingCount,
                    'totalRevenue'     => $totalRevenue,
                    'avgValue'         => $avgValue,
                    'confirmationRate' => $totalCount > 0 ? round(($confirmedCount / $totalCount) * 100, 1) : 0,
                    'cancellationRate' => $totalCount > 0 ? round(($cancelledCount / $totalCount) * 100, 1) : 0,
                ],
                'statusBreakdown'    => $statusBreakdown,
                'daily'              => $dailyRows->map(fn ($row) => [
                    'day'               => $row->day,
                    'reservationsCount' => (int) $row->reservations_count,
                    'revenue'           => (float) $row->revenue,
                ])->values(),
                'monthly'            => $monthly,
                'topResortsByRevenue'=> $topResortsByRevenue,
                'topResortsByCount'  => $topResortsByCount,
                'resorts'            => $resorts,
            ];
        });

        return $this->successResponse($payload, 'Admin analytics fetched');
    }
}
