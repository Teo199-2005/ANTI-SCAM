<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\User;
use App\Shared\Traits\ApiResponseTrait;

class AdminStatsController extends Controller
{
    use ApiResponseTrait;

    public function stats()
    {
        $recentReservations = Reservation::withoutGlobalScopes()
            ->with(['room:id,name', 'resort:id,name'])
            ->latest()
            ->limit(10)
            ->get(['id', 'reference_no', 'status', 'check_in_date', 'check_out_date',
                   'reservation_fee', 'total_amount', 'resort_id', 'room_id', 'created_at']);

        return $this->successResponse([
            'totalResorts'           => Resort::withoutGlobalScopes()->count(),
            'publicResorts'          => Resort::withoutGlobalScopes()->where('is_publicly_listed', true)->count(),
            'suspendedResorts'       => Subscription::withoutGlobalScopes()->where('status', 'suspended')->count(),
            'gracePeriodResorts'     => Subscription::withoutGlobalScopes()->where('status', 'grace_period')->count(),
            'totalUsers'             => User::count(),
            'newUsersThisWeek'       => User::where('created_at', '>=', now()->subDays(7))->count(),
            'totalReservations'      => Reservation::withoutGlobalScopes()->count(),
            'confirmedReservations'  => Reservation::withoutGlobalScopes()->where('status', 'confirmed')->count(),
            'pendingPayment'         => Reservation::withoutGlobalScopes()->where('status', 'pending_payment')->count(),
            'totalRevenue'           => (float) Reservation::withoutGlobalScopes()
                                            ->where('status', 'confirmed')
                                            ->sum('reservation_fee'),
            'revenueThisMonth'       => (float) Reservation::withoutGlobalScopes()
                                            ->where('status', 'confirmed')
                                            ->where('created_at', '>=', now()->startOfMonth())
                                            ->sum('reservation_fee'),
            'recentReservations'     => $recentReservations,
        ], 'Admin platform stats');
    }
}
