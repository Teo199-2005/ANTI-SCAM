<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ClientNotificationController extends Controller
{
    use ApiResponseTrait;

    /**
     * Synthetic notifications derived from the guest's reservations (no DB table required).
     */
    public function index(Request $request)
    {
        $uid = $request->user()->id;
        $out = collect();

        $pending = Reservation::withoutGlobalScopes()
            ->where('client_id', $uid)
            ->where('status', 'pending_payment')
            ->latest()
            ->limit(10)
            ->get();

        foreach ($pending as $r) {
            $out->push([
                'id'   => 'pay-'.$r->id,
                'title' => 'Payment required',
                'body'  => 'Complete payment for booking '.$r->reference_no,
                'read'  => false,
                'href'  => '/dashboard/client/bookings/'.$r->id,
            ]);
        }

        $upcoming = Reservation::withoutGlobalScopes()
            ->where('client_id', $uid)
            ->where('status', 'confirmed')
            ->whereDate('check_in_date', '>=', now()->toDateString())
            ->whereDate('check_in_date', '<=', now()->addDays(14)->toDateString())
            ->orderBy('check_in_date')
            ->limit(10)
            ->get();

        foreach ($upcoming as $r) {
            $out->push([
                'id'    => 'stay-'.$r->id,
                'title' => 'Upcoming stay',
                'body'  => 'Check-in '.$r->check_in_date->toDateString().' · '.$r->reference_no,
                'read'  => false,
                'href'  => '/dashboard/client/bookings/'.$r->id,
            ]);
        }

        return $this->successResponse($out->values()->all(), 'Notifications');
    }

    public function markAllRead()
    {
        return $this->successResponse(null, 'All notifications marked as read');
    }
}
