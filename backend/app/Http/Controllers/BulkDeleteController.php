<?php

namespace App\Http\Controllers;

use App\Models\Resort;
use App\Models\Room;
use App\Models\User;
use App\Services\BulkDeleteService;
use App\Shared\Traits\ApiResponseTrait;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\Request;

class BulkDeleteController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly BulkDeleteService $bulkDelete) {}

    public function users(Request $request)
    {
        $auth = $request->user();
        abort_unless($auth && $auth->role === 'admin', 403);

        $validated = $request->validate([
            'ids' => ['required', 'array', 'max:'.BulkDeleteService::MAX_BATCH],
            'ids.*' => ['integer', 'min:1'],
        ]);

        $result = $this->bulkDelete->deleteUsers($auth, $validated['ids']);

        return $this->successResponse($result->toArray(), 'Bulk delete completed');
    }

    public function rooms(Request $request)
    {
        $auth = $request->user();
        abort_unless($auth && in_array($auth->role, ['admin', 'resort_owner'], true), 403);

        $validated = $request->validate([
            'ids' => ['required', 'array', 'max:'.BulkDeleteService::MAX_BATCH],
            'ids.*' => ['integer', 'min:1'],
        ]);

        $result = $this->bulkDelete->deleteRooms($auth, $validated['ids']);

        return $this->successResponse($result->toArray(), 'Bulk delete completed');
    }

    public function resortGuests(Request $request)
    {
        $auth = $request->user();
        abort_unless($auth && in_array($auth->role, ['resort_owner', 'admin_staff', 'admin'], true), 403);

        $validated = $request->validate([
            'guest_keys' => ['required', 'array', 'max:'.BulkDeleteService::MAX_BATCH],
            'guest_keys.*' => ['string', 'max:320'],
        ]);

        $tenantId = TenantContext::tenantId() ?? $auth->tenant_id;
        if (! $tenantId) {
            return $this->errorResponse('No tenant context', null, 422);
        }

        $result = $this->bulkDelete->deleteResortGuests($auth, (int) $tenantId, $validated['guest_keys']);

        return $this->successResponse($result->toArray(), 'Bulk delete completed');
    }

    public function discountCodes(Request $request, Resort $resort)
    {
        $auth = $request->user();
        abort_unless($auth && in_array($auth->role, ['admin', 'resort_owner'], true), 403);

        $validated = $request->validate([
            'ids' => ['required', 'array', 'max:'.BulkDeleteService::MAX_BATCH],
            'ids.*' => ['integer', 'min:1'],
        ]);

        $result = $this->bulkDelete->deleteDiscountCodes($auth, $resort, $validated['ids']);

        return $this->successResponse($result->toArray(), 'Bulk delete completed');
    }

    public function availability(Request $request, Room $room)
    {
        $auth = $request->user();
        abort_unless($auth && in_array($auth->role, ['admin', 'resort_owner'], true), 403);

        $validated = $request->validate([
            'ids' => ['required', 'array', 'max:'.BulkDeleteService::MAX_BATCH],
            'ids.*' => ['integer', 'min:1'],
        ]);

        $result = $this->bulkDelete->deleteAvailability($auth, $room, $validated['ids']);

        return $this->successResponse($result->toArray(), 'Bulk delete completed');
    }

    public function guestFavorites(Request $request)
    {
        $auth = $request->user();
        abort_unless($auth && $auth->role === 'guest', 403);

        $validated = $request->validate([
            'room_ids' => ['required', 'array', 'max:'.BulkDeleteService::MAX_BATCH],
            'room_ids.*' => ['integer', 'min:1'],
        ]);

        $result = $this->bulkDelete->deleteGuestFavorites($auth, $validated['room_ids']);

        return $this->successResponse($result->toArray(), 'Bulk delete completed');
    }
}
