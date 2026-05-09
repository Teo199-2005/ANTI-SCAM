<?php

namespace App\Modules\Resorts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Support\Tenancy\TenantContext;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\DB;
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

        $search = (string) $request->query('search', '');
        $perPage = min(100, max(1, (int) $request->integer('perPage', 50)));

        $guestKeyExpr = "COALESCE(LOWER(NULLIF(reservations.guest_email, '')), LOWER(NULLIF(users.email, '')), CAST(reservations.client_id AS CHAR), CAST(reservations.id AS CHAR))";

        $guests = DB::table('reservations')
            ->leftJoin('users', 'users.id', '=', 'reservations.client_id')
            ->where('reservations.tenant_id', $tenantId)
            ->when($search !== '', function ($q) use ($search): void {
                $like = '%' . $search . '%';
                $q->where(function ($inner) use ($like): void {
                    $inner->where('reservations.guest_name', 'like', $like)
                        ->orWhere('reservations.guest_email', 'like', $like)
                        ->orWhere('reservations.guest_phone', 'like', $like)
                        ->orWhere('users.name', 'like', $like)
                        ->orWhere('users.email', 'like', $like);
                });
            })
            ->selectRaw("
                {$guestKeyExpr} AS guest_key,
                MAX(COALESCE(NULLIF(reservations.guest_name, ''), users.name)) AS name,
                MAX(COALESCE(NULLIF(reservations.guest_email, ''), users.email)) AS email,
                MAX(COALESCE(NULLIF(reservations.guest_phone, ''), users.phone)) AS phone,
                COUNT(*) AS reservationCount,
                SUM(COALESCE(reservations.reservation_fee, 0)) AS totalSpent,
                MAX(reservations.check_in_date) AS lastCheckIn,
                MAX(reservations.check_out_date) AS lastCheckOut,
                MIN(DATE(reservations.created_at)) AS firstBooking
            ")
            ->groupByRaw($guestKeyExpr)
            ->orderByDesc('reservationCount')
            ->paginate($perPage);

        $guests->getCollection()->transform(function ($row): array {
            return [
                'id' => abs(crc32((string) $row->guest_key)),
                'name' => (string) ($row->name ?? 'Guest'),
                'email' => $row->email,
                'phone' => $row->phone,
                'reservationCount' => (int) $row->reservationCount,
                'totalSpent' => (float) $row->totalSpent,
                'lastCheckIn' => $row->lastCheckIn,
                'lastCheckOut' => $row->lastCheckOut,
                'firstBooking' => $row->firstBooking,
            ];
        });

        return $this->successResponse($guests, 'Resort guests fetched');
    }
}
