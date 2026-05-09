<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\User;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Cache;

class AdminStatsController extends Controller
{
    use ApiResponseTrait;

    public function stats()
    {
        $payload = Cache::remember('dashboard:admin_stats', now()->addSeconds(45), function () {
            $recentReservations = Reservation::withoutGlobalScopes()
                ->with(['room:id,name', 'resort:id,name'])
                ->latest()
                ->limit(10)
                ->get(['id', 'reference_no', 'status', 'check_in_date', 'check_out_date',
                    'reservation_fee', 'total_amount', 'resort_id', 'room_id', 'created_at']);

            $reservationAgg = Reservation::withoutGlobalScopes()
                ->selectRaw("
                    COUNT(*) as total_reservations,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_reservations,
                    SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) as pending_payment,
                    SUM(CASE WHEN status = 'confirmed' THEN reservation_fee ELSE 0 END) as total_revenue,
                    SUM(CASE WHEN status = 'confirmed' AND created_at >= ? THEN reservation_fee ELSE 0 END) as revenue_this_month
                ", [now()->startOfMonth()])
                ->first();

            return [
                'totalResorts'           => Resort::withoutGlobalScopes()->count(),
                'publicResorts'          => Resort::withoutGlobalScopes()->where('is_publicly_listed', true)->count(),
                'suspendedResorts'       => Subscription::withoutGlobalScopes()->where('status', 'suspended')->count(),
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
