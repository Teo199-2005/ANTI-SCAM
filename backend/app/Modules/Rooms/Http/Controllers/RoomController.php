<?php

namespace App\Modules\Rooms\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomAvailability;
use App\Modules\Rooms\Http\Requests\StoreRoomAvailabilityRequest;
use App\Modules\Rooms\Http\Requests\StoreRoomRequest;
use App\Modules\Rooms\Http\Requests\UpdateRoomRequest;
use App\Modules\Rooms\Http\Requests\UpsertRoomDailyRatesRequest;
use App\Services\RoomDailyRateService;
use App\Modules\Rooms\Http\Resources\RoomAvailabilityResource;
use App\Modules\Rooms\Http\Resources\RoomResource;
use App\Modules\Rooms\Services\RoomService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly RoomService $service,
        private readonly RoomDailyRateService $dailyRateService,
    ) {
        $this->authorizeResource(Room::class, 'room');
    }

    public function index(Request $request)
    {
        $resortId = $request->filled('resort_id') ? (int) $request->integer('resort_id') : null;

        $paginator = $this->service->list(
            (int) $request->integer('perPage', 10),
            $request->string('search')->value(),
            $request->string('status')->value(),
            $resortId,
            $request->string('sort_by')->value(),
            $request->string('sort_dir')->value(),
        );

        $collection = RoomResource::collection($paginator);

        if ($resortId !== null) {
            $collection->additional([
                'resort_room_counts' => [
                    'active' => (int) Room::query()->where('resort_id', $resortId)->where('status', 'active')->count(),
                    'total' => (int) Room::query()->where('resort_id', $resortId)->count(),
                ],
            ]);
        }

        /** @var array<string, mixed> $payload */
        $payload = $collection->toResponse($request)->getData(true);

        return $this->successResponse($payload, 'Rooms fetched');
    }

    public function store(StoreRoomRequest $request)
    {
        $room = $this->service->create($request->validated());
        return $this->successResponse(new RoomResource($room), 'Room created', 201);
    }

    public function show(Room $room)
    {
        return $this->successResponse(new RoomResource($room), 'Room details');
    }

    public function update(UpdateRoomRequest $request, Room $room)
    {
        $room = $this->service->update($room, $request->validated());
        return $this->successResponse(new RoomResource($room), 'Room updated');
    }

    public function destroy(Room $room)
    {
        $this->service->delete($room);
        return $this->successResponse(null, 'Room deleted');
    }

    public function availability(Room $room)
    {
        $this->authorize('view', $room);
        $items = RoomAvailabilityResource::collection($this->service->listAvailability($room));
        return $this->successResponse($items, 'Room availability fetched');
    }

    public function storeAvailability(StoreRoomAvailabilityRequest $request, Room $room)
    {
        $record = $this->service->blockAvailability($room, $request->validated());
        return $this->successResponse(new RoomAvailabilityResource($record), 'Room availability period saved', 201);
    }

    public function destroyAvailability(Room $room, RoomAvailability $availability)
    {
        $this->authorize('update', $room);
        $this->service->deleteAvailability($room, $availability);
        return $this->successResponse(null, 'Room availability period deleted');
    }

    public function dailyRates(Request $request, Room $room)
    {
        $this->authorize('view', $room);

        $year = (int) $request->integer('year', now()->year);
        $month = (int) $request->integer('month', now()->month);
        $month = max(1, min(12, $month));

        return $this->successResponse([
            'base_price' => (float) $room->base_price,
            'rates' => $this->dailyRateService->ratesForMonth($room, $year, $month),
        ], 'Room daily rates fetched');
    }

    public function upsertDailyRates(UpsertRoomDailyRatesRequest $request, Room $room)
    {
        $validated = $request->validated();
        $dates = $validated['dates'];
        $this->dailyRateService->upsertDates(
            $room,
            $dates,
            (float) $validated['nightly_price'],
        );

        $anchor = \Carbon\Carbon::parse($dates[0]);

        return $this->successResponse([
            'base_price' => (float) $room->fresh()->base_price,
            'rates' => $this->dailyRateService->ratesForMonth($room, $anchor->year, $anchor->month),
        ], 'Daily rates saved');
    }
}
