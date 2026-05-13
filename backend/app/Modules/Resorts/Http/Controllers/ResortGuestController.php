<?php

namespace App\Modules\Resorts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Modules\Reservations\Http\Resources\ReservationResource;
use App\Support\ResortGuestKey;
use App\Support\Tenancy\TenantContext;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        $guestKeyExpr = ResortGuestKey::sqlExpression();

        $guests = DB::table('reservations')
            ->leftJoin('users', 'users.id', '=', 'reservations.client_id')
            ->where('reservations.tenant_id', $tenantId)
            ->when($search !== '', function ($q) use ($search): void {
                $like = '%'.$search.'%';
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
                'guestKey' => (string) $row->guest_key,
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

    public function reservationsForGuest(Request $request, string $guestKey)
    {
        $user = $request->user();
        if (! in_array($user->role, ['resort_owner', 'admin_staff', 'admin'], true)) {
            abort(403, 'You are not allowed to access this resource.');
        }

        $tenantId = TenantContext::tenantId() ?? $user->tenant_id;
        if (! $tenantId) {
            return $this->errorResponse('No tenant context', null, 422);
        }

        if (in_array($user->role, ['resort_owner', 'admin_staff'], true) && (int) $user->tenant_id !== (int) $tenantId) {
            return $this->errorResponse('Forbidden.', null, 403);
        }

        $guestKey = rawurldecode($guestKey);
        $keyExpr = ResortGuestKey::sqlExpression();
        $keyExprSub = str_replace(
            ['reservations.', 'users.'],
            ['reservations_sub.', 'users_sub.'],
            $keyExpr
        );
        $perPage = min(100, max(1, (int) $request->integer('perPage', 20)));

        $query = Reservation::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereExists(function ($sub) use ($tenantId, $guestKey, $keyExprSub): void {
                $sub->selectRaw('1')
                    ->from('reservations as reservations_sub')
                    ->leftJoin('users as users_sub', 'users_sub.id', '=', 'reservations_sub.client_id')
                    ->whereColumn('reservations_sub.id', 'reservations.id')
                    ->where('reservations_sub.tenant_id', $tenantId)
                    ->whereRaw('('.$keyExprSub.') = ?', [$guestKey]);
            })
            ->with(['resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc', 'room:id,name'])
            ->orderByDesc('check_in_date');

        $paginator = $query->paginate($perPage);
        $resource = ReservationResource::collection($paginator);

        return response()->json([
            'success' => true,
            'message' => 'Guest reservations fetched',
            'data' => $resource->response()->getData(true),
            'errors' => null,
        ]);
    }
}
