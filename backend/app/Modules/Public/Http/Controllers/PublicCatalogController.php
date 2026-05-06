<?php

namespace App\Modules\Public\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BookingLock;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\RoomAvailability;
use App\Models\Tenant;

class PublicCatalogController extends Controller
{
    use ApiResponseTrait;

    public function resorts()
    {
        $perPage = (int) request()->integer('perPage', 12);
        $search  = request()->string('search')->value();

        $resorts = Resort::query()
            ->with(['rooms' => fn ($q) => $q->where('status', 'active')->select('id', 'resort_id')])
            ->withCount(['rooms as active_rooms_count' => fn ($q) => $q->where('status', 'active')])
            ->where('is_publicly_listed', true)
            ->latest()
            ->when($search, function ($query) use ($search): void {
                $query->where(function ($inner) use ($search): void {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('address', 'like', "%{$search}%");
                });
            })
            ->paginate($perPage);

        $pageResortIds = $resorts->getCollection()->pluck('id');
        $minPrices     = Room::withoutGlobalScopes()
            ->whereIn('resort_id', $pageResortIds)
            ->where('status', 'active')
            ->selectRaw('resort_id, MIN(base_price) as min_price')
            ->groupBy('resort_id')
            ->get()
            ->mapWithKeys(fn ($row): array => [(int) $row->resort_id => (float) $row->min_price]);

        $resorts->setCollection($resorts->getCollection()->map(fn (Resort $resort): array => [
            'id'               => $resort->id,
            'name'             => $resort->name,
            'description'      => $resort->description,
            'address'          => $resort->address,
            'contactNumber'    => $resort->contact_number,
            'isVip'            => (bool) $resort->is_vip,
            'activeRoomsCount' => $resort->active_rooms_count,
            'featuredRoomId'   => $resort->rooms->first()?->id,
            'priceFrom'        => $minPrices->get($resort->id),
        ]));

        return $this->successResponse($resorts, 'Public resorts fetched');
    }

    public function resort(Resort $resort)
    {
        if (! $resort->is_publicly_listed) {
            abort(404, 'Resort is not publicly listed.');
        }

        $rooms = $this->roomsForResort($resort);

        return $this->successResponse([
            'id'            => $resort->id,
            'name'          => $resort->name,
            'description'   => $resort->description,
            'address'       => $resort->address,
            'contactNumber' => $resort->contact_number,
            'isVip'         => (bool) $resort->is_vip,
            'rooms'         => $rooms,
        ], 'Resort detail fetched');
    }

    /** Look up a resort by its tenant's subdomain slug (for per-resort subdomain websites). */
    public function resortBySlug(string $slug)
    {
        $tenant = Tenant::withoutGlobalScopes()
            ->where('subdomain', $slug)
            ->first();

        if (! $tenant) {
            return $this->errorResponse('Resort not found.', null, 404);
        }

        $resort = Resort::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_publicly_listed', true)
            ->first();

        if (! $resort) {
            return $this->errorResponse('Resort is not publicly listed.', null, 404);
        }

        $rooms = $this->roomsForResort($resort);

        return $this->successResponse([
            'id'            => $resort->id,
            'slug'          => $slug,
            'tenantId'      => $tenant->id,
            'name'          => $resort->name,
            'description'   => $resort->description,
            'address'       => $resort->address,
            'contactNumber' => $resort->contact_number,
            'isVip'         => (bool) $resort->is_vip,
            'rooms'         => $rooms,
        ], 'Resort detail by slug fetched');
    }

    public function checkAvailability(Room $room)
    {
        if ($room->status !== 'active') {
            return $this->errorResponse('Room is not publicly available', ['room' => ['not_publicly_available']], 404);
        }

        $checkIn  = request()->string('check_in_date')->value();
        $checkOut = request()->string('check_out_date')->value();

        if (! $checkIn || ! $checkOut) {
            return $this->errorResponse('check_in_date and check_out_date are required.', null, 422);
        }

        $dateConflict = fn ($query) => $query
            ->where(function ($q) use ($checkIn, $checkOut): void {
                $q->whereBetween('check_in_date', [$checkIn, $checkOut])
                    ->orWhereBetween('check_out_date', [$checkIn, $checkOut])
                    ->orWhere(function ($inner) use ($checkIn, $checkOut): void {
                        $inner->where('check_in_date', '<=', $checkIn)
                            ->where('check_out_date', '>=', $checkOut);
                    });
            });

        $hasReservation = Reservation::withoutGlobalScopes()
            ->where('room_id', $room->id)
            ->whereIn('status', ['pending_payment', 'confirmed'])
            ->tap($dateConflict)
            ->exists();

        $hasLock = BookingLock::withoutGlobalScopes()
            ->where('room_id', $room->id)
            ->where('status', 'locked')
            ->where('expires_at', '>', now())
            ->tap($dateConflict)
            ->exists();

        $hasBlock = RoomAvailability::withoutGlobalScopes()
            ->where('room_id', $room->id)
            ->where('is_available', false)
            ->tap($dateConflict)
            ->exists();

        $isAvailable = ! $hasReservation && ! $hasLock && ! $hasBlock;

        return $this->successResponse([
            'available'      => $isAvailable,
            'check_in_date'  => $checkIn,
            'check_out_date' => $checkOut,
        ], $isAvailable ? 'Room is available' : 'Room is not available for selected dates');
    }

    public function room(Room $room)
    {
        if ($room->status !== 'active') {
            return $this->errorResponse('Room is not publicly available', ['room' => ['not_publicly_available']], 404);
        }

        $room->load(['resort', 'images']);

        $images = $room->images->map(fn ($img): array => [
            'id'         => $img->id,
            'url'        => $img->url,
            'caption'    => $img->original_name,
            'is_primary' => (bool) $img->is_primary,
        ])->values()->all();

        return $this->successResponse([
            'id'        => $room->id,
            'name'      => $room->name,
            'code'      => $room->code,
            'capacity'  => $room->capacity,
            'basePrice' => $room->base_price,
            'amenities' => $room->amenities ?? [],
            'rules'     => $room->rules,
            'images'    => $images,
            'resort'    => [
                'id'            => $room->resort?->id,
                'name'          => $room->resort?->name,
                'address'       => $room->resort?->address,
                'description'   => $room->resort?->description,
                'contactNumber' => $room->resort?->contact_number,
            ],
        ], 'Public room fetched');
    }

    // ---------- helpers ----------

    private function roomsForResort(Resort $resort): \Illuminate\Support\Collection
    {
        return Room::withoutGlobalScopes()
            ->where('resort_id', $resort->id)
            ->where('status', 'active')
            ->get()
            ->map(fn (Room $room): array => [
                'id'        => $room->id,
                'name'      => $room->name,
                'code'      => $room->code,
                'capacity'  => $room->capacity,
                'basePrice' => $room->base_price,
                'amenities' => $room->amenities ?? [],
                'status'    => $room->status,
            ]);
    }
}
