<?php

namespace App\Modules\Dashboard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BookingLock;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

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

        $recentReservations = Reservation::query()
            ->where('tenant_id', $tenantId)
            ->latest()
            ->limit(5)
            ->get(['id', 'reference_no', 'status', 'check_in_date', 'check_out_date', 'total_amount', 'reservation_fee']);

        // Revenue stats
        $totalReservationFees = Reservation::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->sum('reservation_fee');

        $totalGrossBookings = Reservation::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->sum('total_amount');

        $revenueThisMonth = Reservation::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('reservation_fee');

        $totalConfirmed = Reservation::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->count();

        $totalPending = Reservation::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'pending_payment')
            ->count();

        return $this->successResponse([
            'activeRooms'          => Room::query()->where('tenant_id', $tenantId)->where('status', 'active')->count(),
            'lockedBookings'       => BookingLock::query()
                ->where('tenant_id', $tenantId)
                ->where('status', 'locked')
                ->where('expires_at', '>', now())
                ->count(),
            'confirmedToday'       => Reservation::query()
                ->where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->whereDate('created_at', now()->toDateString())
                ->count(),
            'totalConfirmed'       => $totalConfirmed,
            'totalPending'         => $totalPending,
            'totalReservationFees' => (float) $totalReservationFees,
            'totalGrossBookings'   => (float) $totalGrossBookings,
            'revenueThisMonth'     => (float) $revenueThisMonth,
            'recentReservations'   => $recentReservations,
        ], 'Resort dashboard stats');
    }
}
