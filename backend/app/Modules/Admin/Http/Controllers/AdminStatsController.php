<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Support\SubscriptionPlan;
use App\Models\User;
use App\Support\CacheSafe;
use App\Shared\Traits\ApiResponseTrait;

class AdminStatsController extends Controller
{
    use ApiResponseTrait;

    public function stats()
    {
        $payload = CacheSafe::remember('dashboard:admin_stats', now()->addSeconds(45), function () {
            $recentReservations = Reservation::withoutGlobalScopes()
                ->with(['room:id,name', 'resort:id,name'])
                ->latest()
                ->limit(10)
                ->get(['id', 'reference_no', 'status', 'check_in_date', 'check_out_date',
                    'reservation_fee', 'total_amount', 'resort_id', 'room_id', 'created_at']);

            $revIn = Reservation::revenueEligibleStatusesSqlList();
            $reservationAgg = Reservation::withoutGlobalScopes()
                ->selectRaw("
                    COUNT(*) as total_reservations,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_reservations,
                    SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) as pending_payment,
                    SUM(CASE WHEN status IN ({$revIn}) THEN reservation_fee ELSE 0 END) as total_revenue,
                    SUM(CASE WHEN status IN ({$revIn}) AND created_at >= ? THEN reservation_fee ELSE 0 END) as revenue_this_month
                ", [now()->startOfMonth()])
                ->first();

            $monthStart = now()->startOfMonth();
            $subscriptionRevenueMonth = (float) SubscriptionInvoice::withoutGlobalScopes()
                ->where('status', 'paid')
                ->where('paid_at', '>=', $monthStart)
                ->where('plan', 'like', SubscriptionPlan::BUSINESS_PRO.'%')
                ->sum('amount');

            return [
                'totalResorts'           => Resort::withoutGlobalScopes()->count(),
                'publicResorts'          => Resort::withoutGlobalScopes()->where('is_publicly_listed', true)->count(),
                'standardResorts'        => Subscription::withoutGlobalScopes()->where('plan', SubscriptionPlan::STANDARD)->count(),
                'businessProResorts'     => Subscription::withoutGlobalScopes()
                    ->where('plan', SubscriptionPlan::BUSINESS_PRO)
                    ->whereIn('status', ['active', 'grace_period'])
                    ->count(),
                'subscriptionRevenueMonth' => $subscriptionRevenueMonth,
                'expiringSubscriptions'  => Subscription::withoutGlobalScopes()
                    ->where('plan', SubscriptionPlan::BUSINESS_PRO)
                    ->whereIn('status', ['active', 'grace_period'])
                    ->whereBetween('next_due_date', [now()->toDateString(), now()->addDays(7)->toDateString()])
                    ->count(),
                'failedPayments'         => SubscriptionInvoice::withoutGlobalScopes()
                    ->whereIn('status', ['failed', 'expired'])
                    ->where('created_at', '>=', now()->subDays(30))
                    ->count(),
                'suspendedResorts'       => Subscription::withoutGlobalScopes()->where('status', 'expired')->count(),
                'gracePeriodResorts'     => Subscription::withoutGlobalScopes()->where('status', 'grace_period')->count(),
                'totalUsers'             => User::count(),
                'newUsersThisWeek'       => User::where('created_at', '>=', now()->subDays(7))->count(),
                'totalReservations'      => (int) ($reservationAgg->total_reservations ?? 0),
                'confirmedReservations'  => (int) ($reservationAgg->confirmed_reservations ?? 0),
                'pendingPayment'         => (int) ($reservationAgg->pending_payment ?? 0),
                'totalRevenue'           => (float) ($reservationAgg->total_revenue ?? 0),
                'revenueThisMonth'       => (float) ($reservationAgg->revenue_this_month ?? 0),
                'recentReservations'     => $recentReservations,
            ];
        });

        return $this->successResponse($payload, 'Admin platform stats');
    }
}
