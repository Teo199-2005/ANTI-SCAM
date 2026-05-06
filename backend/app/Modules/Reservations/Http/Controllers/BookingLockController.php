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
        $validated = $request->validate([
            'room_id'        => ['required', 'integer', 'exists:rooms,id'],
            'check_in_date'  => ['required', 'date', 'after_or_equal:today'],
            'check_out_date' => ['required', 'date', 'after:check_in_date'],
        ]);

        // Resolve tenant_id: from middleware context → authenticated user → room's own tenant
        $tenant   = app()->bound('tenant') ? app('tenant') : null;
        $room     = Room::withoutGlobalScopes()->findOrFail($validated['room_id']);
        $tenantId = $tenant?->id ?? $request->user()?->tenant_id ?? $room->tenant_id;

        if (! $tenantId) {
            return $this->errorResponse('Tenant context could not be resolved.', null, 400);
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
