<?php

namespace App\Modules\Reservations\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Modules\Reservations\Services\BookingLockService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use RuntimeException;

class BookingLockController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly BookingLockService $locks) {}

    public function store(Request $request)
    {
        if (! in_array($request->user()?->role, ['admin', 'client', 'user', 'guest'], true)) {
            return $this->errorResponse('Only guests can initiate booking locks.', null, 403);
        }

        $validated = $request->validate([
            'room_id'        => ['required', 'integer', 'exists:rooms,id'],
            'check_in_date'  => ['required', 'date', 'after_or_equal:today'],
            'check_out_date' => ['required', 'date', 'after:check_in_date'],
        ]);

        // Resolve tenant_id: from middleware context → authenticated user → room's own tenant
        $tenant   = app()->bound('tenant') ? app('tenant') : null;
        $room     = Room::withoutGlobalScopes()->findOrFail($validated['room_id']);
        $tenantId = (int) $room->tenant_id;

        if ($request->user()?->role === 'guest') {
            $homeId = $request->user()->home_resort_id;
            if (! $homeId || (int) $room->resort_id !== (int) $homeId) {
                return $this->errorResponse('You can only book rooms at your home resort.', null, 403);
            }
        }

        if (! $tenantId) {
            return $this->errorResponse('Tenant context could not be resolved.', null, 400);
        }

        // Reject cross-tenant lock attempts from authenticated users.
        if ($request->user()?->tenant_id && (int) $request->user()->tenant_id !== $tenantId) {
            return $this->errorResponse('You cannot book rooms outside your tenant scope.', null, 403);
        }

        // If request is bound to subdomain tenant, it must match the room tenant.
        if ($tenant?->id && (int) $tenant->id !== $tenantId) {
            return $this->errorResponse('Booking tenant context does not match selected room.', null, 409);
        }

        try {
            $lock = $this->locks->createLock([
                ...$validated,
                'tenant_id' => $tenantId,
            ]);
        } catch (RuntimeException $exception) {
            return $this->errorResponse($exception->getMessage(), ['lock' => ['conflict']], 409);
        }

        return $this->successResponse($lock, 'Room locked for 10 minutes', 201);
    }
}
