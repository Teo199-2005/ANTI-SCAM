<?php

namespace App\Modules\Resorts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Support\Tenancy\TenantContext;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ResortGuestController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $user     = $request->user();
        $tenantId = TenantContext::tenantId() ?? $user?->tenant_id;

        if (! $tenantId) {
            return $this->successResponse([], 'No tenant context');
        }

        $search = $request->query('search');

        $reservations = Reservation::query()
            ->where('tenant_id', $tenantId)
            ->with('client:id,name,email,phone')
            ->when($search, function ($q, $s): void {
                $like = '%' . $s . '%';
                $q->where(function ($inner) use ($like): void {
                    $inner->where('guest_name', 'like', $like)
                          ->orWhere('guest_email', 'like', $like)
                          ->orWhere('guest_phone', 'like', $like)
                          ->orWhereHas('client', fn ($u) => $u->where('name', 'like', $like)
                              ->orWhere('email', 'like', $like));
                });
            })
            ->orderByDesc('created_at')
            ->get([
                'id', 'guest_name', 'guest_email', 'guest_phone',
                'client_id', 'check_in_date', 'check_out_date',
                'total_amount', 'reservation_fee', 'status', 'created_at',
            ]);

        // Deduplicate by resolved email key
        $guestMap = [];

        foreach ($reservations as $r) {
            // Resolve display name/email/phone — prefer explicit guest fields, fallback to linked user
            $name  = $r->guest_name  ?? $r->client?->name;
            $email = $r->guest_email ?? $r->client?->email;
            $phone = $r->guest_phone ?? $r->client?->phone ?? null;

            if (! $name) {
                continue; // skip fully anonymous rows
            }

            $key = $email
                ? strtolower(trim($email))
                : strtolower(trim($name)) . '|' . ($phone ?? '');

            if (! isset($guestMap[$key])) {
                $guestMap[$key] = [
                    'id'               => $r->client_id ?? crc32($key),
                    'name'             => $name,
                    'email'            => $email,
                    'phone'            => $phone,
                    'reservationCount' => 0,
                    'totalSpent'       => 0.0,
                    'lastCheckIn'      => null,
                    'lastCheckOut'     => null,
                    'firstBooking'     => null,
                ];
            }

            $guestMap[$key]['reservationCount']++;
            $guestMap[$key]['totalSpent'] += (float) $r->reservation_fee;

            $bookingDate = $r->created_at?->toDateString();
            if ($guestMap[$key]['firstBooking'] === null || $bookingDate < $guestMap[$key]['firstBooking']) {
                $guestMap[$key]['firstBooking'] = $bookingDate;
            }

            $checkIn = $r->check_in_date?->toDateString();
            if ($checkIn && ($guestMap[$key]['lastCheckIn'] === null || $checkIn > $guestMap[$key]['lastCheckIn'])) {
                $guestMap[$key]['lastCheckIn']  = $checkIn;
                $guestMap[$key]['lastCheckOut'] = $r->check_out_date?->toDateString();
            }
        }

        $guests = array_values($guestMap);
        usort($guests, fn ($a, $b) => $b['reservationCount'] <=> $a['reservationCount']);

        return $this->successResponse($guests, 'Resort guests fetched');
    }
}
