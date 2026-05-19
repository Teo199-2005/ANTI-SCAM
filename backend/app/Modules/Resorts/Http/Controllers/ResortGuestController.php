<?php

namespace App\Modules\Resorts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\User;
use App\Modules\Reservations\Http\Resources\ReservationResource;
use App\Modules\Resorts\Services\ResortGuestService;
use App\Support\ResortGuestKey;
use App\Support\Tenancy\TenantContext;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ResortGuestController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly ResortGuestService $guests) {}

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
        $revIn = Reservation::revenueEligibleStatusesSqlList();
        $cancellableIn = implode(',', array_map(
            static fn (string $s): string => "'{$s}'",
            Reservation::CANCELLABLE_STATUSES
        ));

        $guests = DB::table('reservations')
            ->leftJoin('users', 'users.id', '=', 'reservations.client_id')
            ->where('reservations.tenant_id', $tenantId)
            ->whereRaw('NOT '.ResortGuestKey::isAnonymizedDirectoryRowSql())
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
                MAX(reservations.client_id) AS client_id,
                COUNT(*) AS reservationCount,
                SUM(CASE WHEN reservations.status IN ({$cancellableIn}) THEN 1 ELSE 0 END) AS activeReservationCount,
                SUM(CASE WHEN reservations.status IN ({$revIn}) THEN COALESCE(reservations.reservation_fee, 0) ELSE 0 END) AS totalSpent,
                MAX(reservations.check_in_date) AS lastCheckIn,
                MAX(reservations.check_out_date) AS lastCheckOut,
                MIN(DATE(reservations.created_at)) AS firstBooking
            ")
            ->groupByRaw($guestKeyExpr)
            ->orderByDesc('reservationCount')
            ->paginate($perPage);

        $guestAccountsByEmail = User::query()
            ->whereIn('role', ['client', 'user'])
            ->whereExists(function ($sub) use ($tenantId): void {
                $sub->selectRaw('1')
                    ->from('reservations')
                    ->whereColumn('reservations.client_id', 'users.id')
                    ->where('reservations.tenant_id', $tenantId);
            })
            ->get(['id', 'email', 'role'])
            ->mapWithKeys(fn (User $u) => [mb_strtolower((string) $u->email) => $u->id])
            ->all();

        $existingKeys = [];
        $guests->getCollection()->transform(function ($row) use (&$existingKeys, $guestAccountsByEmail): array {
            $guestKey = (string) $row->guest_key;
            $existingKeys[] = $guestKey;
            $emailKey = mb_strtolower(trim((string) ($row->email ?? '')));
            $accountUserId = $emailKey !== '' ? ($guestAccountsByEmail[$emailKey] ?? null) : null;
            if ($accountUserId === null && ! empty($row->client_id)) {
                $linked = User::query()->find((int) $row->client_id);
                if ($linked && in_array($linked->role, ['client', 'user'], true)) {
                    $accountUserId = $linked->id;
                }
            }
            $hasLogin = $accountUserId !== null;

            return [
                'id' => abs(crc32($guestKey)),
                'guestKey' => $guestKey,
                'name' => (string) ($row->name ?? 'Guest'),
                'email' => $row->email,
                'phone' => $row->phone,
                'reservationCount' => (int) $row->reservationCount,
                'activeReservationCount' => (int) ($row->activeReservationCount ?? 0),
                'totalSpent' => (float) $row->totalSpent,
                'lastCheckIn' => $row->lastCheckIn,
                'lastCheckOut' => $row->lastCheckOut,
                'firstBooking' => $row->firstBooking,
                'userId' => $hasLogin ? (int) $accountUserId : null,
                'hasLoginAccount' => $hasLogin,
            ];
        });

        return $this->successResponse($guests, 'Resort guests fetched');
    }

    public function show(Request $request, string $guestKey)
    {
        $tenantId = $this->resolveTenantId($request);
        if (! $tenantId) {
            return $this->errorResponse('No tenant context', null, 422);
        }

        return $this->successResponse(
            $this->guests->show($tenantId, $guestKey),
            'Guest details fetched',
        );
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

        $perPage = min(100, max(1, (int) $request->integer('perPage', 20)));

        $query = $this->guests->reservationsMatchingKey($tenantId, $guestKey)
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

    private function resolveTenantId(Request $request): ?int
    {
        $user = $request->user();
        $tenantId = TenantContext::tenantId() ?? $user?->tenant_id;

        if (! $tenantId) {
            return null;
        }

        if (in_array($user->role, ['resort_owner', 'admin_staff'], true) && (int) $user->tenant_id !== (int) $tenantId) {
            abort(403, 'You are not allowed to access this resource.');
        }

        return (int) $tenantId;
    }
}
