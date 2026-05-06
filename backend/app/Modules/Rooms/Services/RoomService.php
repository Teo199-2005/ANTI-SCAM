<?php

namespace App\Modules\Rooms\Services;

use App\Models\Room;
use App\Models\Resort;
use App\Models\Subscription;
use App\Modules\Subscriptions\Services\SubscriptionService;
use Illuminate\Validation\ValidationException;
use App\Models\RoomAvailability;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

class RoomService
{
    public function __construct(private readonly \App\Modules\Subscriptions\Services\SubscriptionService $subscriptions) {}
    public function list(int $perPage = 10, ?string $search = null, ?string $status = null): LengthAwarePaginator
    {
        $query = Room::query()->latest();

        if ($search) {
            $query->where(function ($inner) use ($search): void {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        return $query->paginate($perPage);
    }

    public function create(array $payload): Room
    {
        // enforce subscription active room limits for the resort
        $resortId = $payload['resort_id'] ?? null;
        if ($resortId) {
            $resort = Resort::query()->find($resortId);
            if ($resort) {
                $activeCount = $resort->rooms()->where('status', 'active')->count();

                // try to read subscription included rooms
                $subscription = Subscription::query()->where('resort_id', $resort->id)->first();
                $included = $subscription?->included_rooms;

                // fallback: derive included from plan via SubscriptionService if missing
                if ($included === null) {
                    $plan = $subscription?->plan ?? 'basic';
                    $pricing = $this->subscriptions->calculateMonthlyBilling($plan, $activeCount);
                    $included = $pricing['included_rooms'] ?? PHP_INT_MAX;
                }

                if ($included !== null && $activeCount >= (int) $included) {
                    throw ValidationException::withMessages([
                        'resort_id' => ["Active room limit reached for this plan (" . $included . "). Please upgrade your subscription to add more rooms."],
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
        $room->update($payload);
        return $room->refresh();
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
