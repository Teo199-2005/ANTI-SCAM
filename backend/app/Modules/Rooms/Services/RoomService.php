<?php

namespace App\Modules\Rooms\Services;

use App\Models\Resort;
use App\Models\Room;
use App\Models\RoomAvailability;
use App\Models\Subscription;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Support\SubscriptionPlan;
use App\Services\RoomOccupancyService;
use App\Support\SafeSort;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RoomService
{
    public function __construct(private readonly SubscriptionService $subscriptions) {}

    public function list(
        int $perPage = 10,
        ?string $search = null,
        ?string $status = null,
        ?int $resortId = null,
        ?string $sortBy = null,
        ?string $sortDir = null,
    ): LengthAwarePaginator {
        $query = Room::query();

        if ($resortId) {
            $query->where('resort_id', $resortId);
        }

        if ($search) {
            $query->where(function ($inner) use ($search): void {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        SafeSort::apply(
            $query,
            $sortBy,
            $sortDir,
            ['name', 'code', 'capacity', 'units', 'base_price', 'status', 'created_at', 'id'],
            'name',
            'asc',
        );

        return $query->paginate($perPage);
    }

    public function create(array $payload): Room
    {
        $payload['units'] = isset($payload['units']) ? max(1, min(99, (int) $payload['units'])) : 1;

        // enforce subscription active room limits for the resort
        $resortId = $payload['resort_id'] ?? null;
        if ($resortId) {
            $resort = Resort::query()->find($resortId);
            if ($resort) {
                $activeCount = $resort->rooms()->where('status', 'active')->count();

                // try to read subscription included rooms
                $subscription = Subscription::query()->where('resort_id', $resort->id)->first();
                $included = SubscriptionPlan::maxRoomsForSubscription($subscription);

                if ($activeCount >= $included) {
                    throw ValidationException::withMessages([
                        'resort_id' => ["Active room limit reached for this plan ({$included} rooms). Upgrade to Business Pro for up to 20 rooms."],
                    ]);
                }
            }
        }

        return Room::create([
            ...$payload,
            'tenant_id' => $payload['tenant_id'] ?? Auth::user()?->tenant_id,
        ]);
    }

    public function update(Room $room, array $payload): Room
    {
        return DB::transaction(function () use ($room, $payload) {
            if (array_key_exists('units', $payload)) {
                $incomingUnits = max(1, min(99, (int) $payload['units']));
                $currentUnits = max(1, (int) ($room->units ?? 1));
                if ($incomingUnits < $currentUnits) {
                    $depth = RoomOccupancyService::maxConcurrentReservationDepth((int) $room->id);
                    if ($incomingUnits < $depth) {
                        throw ValidationException::withMessages([
                            'units' => ["Overlapping bookings require at least {$depth} unit(s). Lower the total units after those bookings complete."],
                        ]);
                    }
                }
            }

            $room->fill($payload);
            $room->save();

            if ($room->status === 'active') {
                $this->reconcileActiveRoomCap((int) $room->resort_id, (int) $room->id);
            }

            return $room->refresh();
        });
    }

    /**
     * When active room rows exceed subscription included_rooms, deactivate extras while keeping this room (plus others by stable id order).
     */
  public function reconcileResortActiveRooms(int $resortId): void
  {
    $preferred = Room::query()
      ->where('resort_id', $resortId)
      ->where('status', 'active')
      ->orderBy('id')
      ->value('id');

    if ($preferred) {
      $this->reconcileActiveRoomCap($resortId, (int) $preferred);
    }
  }

    private function reconcileActiveRoomCap(int $resortId, int $preferredRoomId): void
    {
        $included = $this->resolveIncludedRooms($resortId);
        if ($included >= 1_000_000) {
            return;
        }

        $activeIds = Room::query()
            ->where('resort_id', $resortId)
            ->where('status', 'active')
            ->orderBy('id')
            ->pluck('id');

        if ($activeIds->count() <= $included) {
            return;
        }

        $keep = collect([(int) $preferredRoomId]);
        foreach ($activeIds as $rid) {
            if ($keep->count() >= $included) {
                break;
            }
            $rid = (int) $rid;
            if ($keep->contains($rid)) {
                continue;
            }
            $keep->push($rid);
        }

        Room::query()
            ->where('resort_id', $resortId)
            ->where('status', 'active')
            ->whereNotIn('id', $keep->unique()->values()->all())
            ->update(['status' => 'inactive']);
    }

    private function resolveIncludedRooms(int $resortId): int
    {
        $subscription = Subscription::query()->where('resort_id', $resortId)->first();

        return SubscriptionPlan::maxRoomsForSubscription($subscription);
    }

    public function delete(Room $room): void
    {
        $room->delete();
    }

    public function blockAvailability(Room $room, array $payload): RoomAvailability
    {
        return RoomAvailability::create([
            ...$payload,
            'tenant_id' => $room->tenant_id,
            'room_id' => $room->id,
        ]);
    }

    public function listAvailability(Room $room): Collection
    {
        return $room->availability()->latest()->limit(60)->get();
    }

    public function deleteAvailability(Room $room, RoomAvailability $availability): void
    {
        if ((int) $availability->room_id !== (int) $room->id) {
            abort(404);
        }

        $availability->delete();
    }
}
