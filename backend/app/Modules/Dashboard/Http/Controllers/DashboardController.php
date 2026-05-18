<?php

namespace App\Modules\Dashboard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BookingLock;
use App\Models\Reservation;
use App\Models\Resort;
use App\Services\PlanFeatureResolver;
use App\Models\Room;
use App\Models\User;
use App\Support\CacheSafe;
use App\Shared\Traits\ApiResponseTrait;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use ApiResponseTrait;

    public function stats()
    {
        return $this->successResponse([
            'totalUsers'       => User::count(),
            'adminUsers'       => User::where('role', 'admin')->count(),
            'newUsersThisWeek' => User::where('created_at', '>=', now()->subDays(7))->count(),
        ], 'Dashboard stats');
    }

    public function resortStats(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        if (! $tenantId) {
            return $this->errorResponse('No resort is linked to this account yet.', null, 422);
        }

        $cacheKey = "dashboard:resort_stats:v2:{$tenantId}";

        $payload = CacheSafe::remember($cacheKey, now()->addSeconds(45), fn () => $this->computeResortDashboardStats($tenantId));

        return $this->successResponse($payload, 'Resort dashboard stats');
    }

    /**
     * @return array<string, mixed>
     */
    private function computeResortDashboardStats(int $tenantId): array
    {
        $revIn = Reservation::revenueEligibleStatusesSqlList();

        $recentReservations = Reservation::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'reference_no', 'status', 'check_in_date', 'check_out_date', 'total_amount', 'reservation_fee'])
            ->map(static fn (Reservation $r): array => [
                'id' => $r->id,
                'reference_no' => $r->reference_no,
                'status' => $r->status,
                'check_in_date' => $r->check_in_date?->format('Y-m-d') ?? substr((string) $r->check_in_date, 0, 10),
                'check_out_date' => $r->check_out_date?->format('Y-m-d') ?? substr((string) $r->check_out_date, 0, 10),
                'total_amount' => (string) $r->total_amount,
                'reservation_fee' => (string) $r->reservation_fee,
            ])
            ->values()
            ->all();

        $agg = Reservation::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->selectRaw("
                SUM(CASE WHEN status IN ({$revIn}) THEN reservation_fee ELSE 0 END) as total_reservation_fees,
                SUM(CASE WHEN status IN ({$revIn}) THEN total_amount ELSE 0 END) as total_gross_bookings,
                SUM(CASE WHEN status IN ({$revIn}) AND created_at >= ? THEN reservation_fee ELSE 0 END) as revenue_this_month,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as total_confirmed,
                SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) as total_pending,
                SUM(CASE WHEN status = 'confirmed' AND DATE(created_at) = ? THEN 1 ELSE 0 END) as confirmed_today
            ", [now()->startOfMonth(), now()->toDateString()])
            ->first();

        return [
            'activeRooms'          => Room::query()->where('tenant_id', $tenantId)->where('status', 'active')->count(),
            'lockedBookings'       => BookingLock::query()
                ->where('tenant_id', $tenantId)
                ->where('status', 'locked')
                ->where('expires_at', '>', now())
                ->count(),
            'confirmedToday'       => (int) ($agg->confirmed_today ?? 0),
            'totalConfirmed'       => (int) ($agg->total_confirmed ?? 0),
            'totalPending'         => (int) ($agg->total_pending ?? 0),
            'totalReservationFees' => (float) ($agg->total_reservation_fees ?? 0),
            'totalGrossBookings'   => (float) ($agg->total_gross_bookings ?? 0),
            'revenueThisMonth'     => (float) ($agg->revenue_this_month ?? 0),
            'recentReservations'   => $recentReservations,
        ];
    }

    public function resortRevenueAnalytics(Request $request, PlanFeatureResolver $plans)
    {
        $tenantId = $request->user()->tenant_id;
        if (! $tenantId) {
            return $this->errorResponse('Tenant not found for current user.', null, 422);
        }

        $resort = Resort::withoutGlobalScopes()->where('tenant_id', $tenantId)->with('subscription')->first();
        $plans->assertFeature($resort?->subscription, 'revenue_reports');

        $period = (string) $request->input('period', 'monthly'); // weekly | monthly | yearly | custom
        $year   = (int) $request->input('year', now()->year);
        $month  = $request->filled('month') ? (int) $request->input('month') : null;
        $week   = $request->filled('week') ? (int) $request->input('week') : null;
        $from   = $request->input('from');
        $to     = $request->input('to');

        $cacheKey = sprintf(
            'dashboard:resort_revenue:%s:%s:%s:%s:%s:%s',
            $tenantId,
            $period,
            $year,
            $month,
            $week,
            ($from ?? '') . ':' . ($to ?? '')
        );

        $payload = CacheSafe::remember($cacheKey, now()->addSeconds(45), function () use (
            $tenantId,
            $period,
            $year,
            $month,
            $week,
            $from,
            $to
        ) {
            $revIn = Reservation::revenueEligibleStatusesSqlList();
            $base = Reservation::withoutGlobalScopes()
                ->where('tenant_id', $tenantId);

            if ($period === 'weekly') {
                $targetWeek = $week ?: now()->isoWeek();
                $weekStart = CarbonImmutable::now()->setISODate($year, $targetWeek)->startOfWeek();
                $weekEnd = $weekStart->endOfWeek();
                $base->whereBetween('created_at', [$weekStart->startOfDay(), $weekEnd->endOfDay()]);
            } elseif ($period === 'monthly') {
                $base->whereYear('created_at', $year)
                    ->when($month, fn ($q) => $q->whereMonth('created_at', $month));
            } elseif ($period === 'yearly') {
                $base->whereYear('created_at', $year);
            } elseif ($period === 'custom' && $from && $to) {
                $base->whereDate('created_at', '>=', $from)
                    ->whereDate('created_at', '<=', $to);
            }

            $summary = (clone $base)
                ->selectRaw("
                    SUM(CASE WHEN status IN ({$revIn}) THEN reservation_fee ELSE 0 END) as total_reservation_fees,
                    SUM(CASE WHEN status IN ({$revIn}) THEN total_amount ELSE 0 END) as total_gross_bookings,
                    SUM(CASE WHEN status IN ({$revIn}) AND created_at >= ? THEN reservation_fee ELSE 0 END) as revenue_this_month,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as total_confirmed,
                    SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) as total_pending
                ", [now()->startOfMonth()])
                ->first();

            $dailyRows = (clone $base)
                ->selectRaw("
                    DATE(created_at) as day,
                    COUNT(*) as reservations_count,
                    SUM(CASE WHEN status IN ({$revIn}) THEN reservation_fee ELSE 0 END) as fees_collected,
                    SUM(CASE WHEN status IN ({$revIn}) THEN total_amount ELSE 0 END) as gross_bookings,
                    SUM(CASE WHEN status IN ({$revIn}) THEN 1 ELSE 0 END) as confirmed_count
                ")
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('day')
                ->get();

            $resort = Resort::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->first();

            return [
                'summary' => [
                    'totalReservationFees' => (float) ($summary->total_reservation_fees ?? 0),
                    'totalGrossBookings'   => (float) ($summary->total_gross_bookings ?? 0),
                    'revenueThisMonth'     => (float) ($summary->revenue_this_month ?? 0),
                    'totalConfirmed'       => (int) ($summary->total_confirmed ?? 0),
                    'totalPending'         => (int) ($summary->total_pending ?? 0),
                ],
                'series' => $dailyRows->map(fn ($row) => [
                    'date'         => $row->day,
                    'reservations' => (int) $row->reservations_count,
                    'confirmed'    => (int) $row->confirmed_count,
                    'feesCollected'=> (float) $row->fees_collected,
                    'grossBookings'=> (float) $row->gross_bookings,
                ])->values(),
                'resort' => [
                    'name'     => $resort?->name,
                    'logo_url' => $resort?->logo_url,
                ],
                'filters' => [
                    'period' => $period,
                    'year'   => $year,
                    'month'  => $month,
                    'week'   => $week,
                    'from'   => $from,
                    'to'     => $to,
                ],
            ];
        });

        return $this->successResponse($payload, 'Resort revenue analytics fetched');
    }

    public function resortBookingCalendar(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        if (! $tenantId) {
            return $this->errorResponse('Tenant not found for current user.', null, 422);
        }

        $year = (int) $request->input('year', now()->year);
        $month = (int) $request->input('month', now()->month);
        if ($month < 1 || $month > 12) {
            return $this->errorResponse('Invalid month. Use 1-12.', null, 422);
        }

        $start = now()->setDate($year, $month, 1)->startOfDay();
        $end = $start->copy()->endOfMonth()->endOfDay();

        $rows = Reservation::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['pending_payment', 'confirmed', 'completed'])
            ->whereDate('check_in_date', '<=', $end->toDateString())
            ->whereDate('check_out_date', '>=', $start->toDateString())
            ->orderBy('check_in_date')
            ->get([
                'id',
                'reference_no',
                'status',
                'check_in_date',
                'check_out_date',
                'total_amount',
            ])
            ->map(static fn (Reservation $r): array => [
                'id' => $r->id,
                'reference_no' => $r->reference_no,
                'status' => $r->status,
                'check_in_date' => $r->check_in_date?->format('Y-m-d') ?? substr((string) $r->check_in_date, 0, 10),
                'check_out_date' => $r->check_out_date?->format('Y-m-d') ?? substr((string) $r->check_out_date, 0, 10),
                'total_amount' => (string) $r->total_amount,
            ])
            ->values()
            ->all();

        return $this->successResponse([
            'year' => $year,
            'month' => $month,
            'start' => $start->toDateString(),
            'end' => $end->toDateString(),
            'reservations' => $rows,
        ], 'Resort booking calendar fetched');
    }
}
