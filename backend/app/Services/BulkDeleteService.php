<?php

namespace App\Services;

use App\Models\DiscountCode;
use App\Models\GuestFavoriteRoom;
use App\Models\Resort;
use App\Models\Room;
use App\Models\RoomAvailability;
use App\Models\User;
use App\Modules\Resorts\Services\ResortGuestService;
use App\Modules\Rooms\Services\RoomService;
use App\Modules\Users\Services\UserService;
use App\Support\BulkDeleteResult;
use App\Support\FriendlyExceptionMessage;
use App\Support\Tenancy\TenantContext;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class BulkDeleteService
{
    public const MAX_BATCH = 50;

    public function __construct(
        private readonly UserService $users,
        private readonly RoomService $rooms,
        private readonly ResortGuestService $resortGuests,
    ) {}

    /**
     * @param  list<int>  $ids
     */
    public function deleteUsers(User $auth, array $ids): BulkDeleteResult
    {
        $result = new BulkDeleteResult;

        foreach ($this->capIds($ids) as $id) {
            $user = User::query()->find($id);
            if (! $user) {
                $result->recordFailure($id, 'User not found.');

                continue;
            }

            try {
                Gate::forUser($auth)->authorize('delete', $user);
                $this->users->delete($user);
                $result->recordSuccess();
            } catch (AuthorizationException $e) {
                $result->recordFailure($id, $e->getMessage() ?: 'Not allowed.');
            } catch (\Throwable $e) {
                $result->recordFailure($id, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<int>  $ids
     */
    public function deleteRooms(User $auth, array $ids): BulkDeleteResult
    {
        $result = new BulkDeleteResult;

        foreach ($this->capIds($ids) as $id) {
            $room = Room::query()->find($id);
            if (! $room) {
                $result->recordFailure($id, 'Room not found.');

                continue;
            }

            try {
                Gate::forUser($auth)->authorize('delete', $room);
                $this->rooms->delete($room);
                $result->recordSuccess();
            } catch (AuthorizationException $e) {
                $result->recordFailure($id, $e->getMessage() ?: 'Not allowed.');
            } catch (\Throwable $e) {
                $result->recordFailure($id, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<string>  $guestKeys
     */
    public function deleteResortGuests(User $auth, int $tenantId, array $guestKeys): BulkDeleteResult
    {
        if (! in_array($auth->role, ['resort_owner', 'admin_staff', 'admin'], true)) {
            throw new AuthorizationException('You are not allowed to delete guests.');
        }

        if ($auth->role !== 'admin' && (int) $auth->tenant_id !== $tenantId) {
            throw new AuthorizationException('Access denied.');
        }

        $result = new BulkDeleteResult;
        $keys = array_slice(array_values(array_unique(array_map(
            static fn ($k): string => rawurldecode((string) $k),
            $guestKeys,
        ))), 0, self::MAX_BATCH);

        foreach ($keys as $guestKey) {
            try {
                $this->resortGuests->destroy($tenantId, $guestKey);
                $result->recordSuccess();
            } catch (ValidationException $e) {
                $result->recordFailure($guestKey, FriendlyExceptionMessage::forBulkDelete($e));
            } catch (\Throwable $e) {
                $result->recordFailure($guestKey, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<int>  $ids
     */
    public function deleteDiscountCodes(User $auth, Resort $resort, array $ids): BulkDeleteResult
    {
        $this->authorizeResortAccess($auth, $resort);

        $result = new BulkDeleteResult;

        foreach ($this->capIds($ids) as $id) {
            $code = DiscountCode::query()
                ->where('resort_id', $resort->id)
                ->whereKey($id)
                ->first();

            if (! $code) {
                $result->recordFailure($id, 'Discount code not found.');

                continue;
            }

            try {
                $code->delete();
                $result->recordSuccess();
            } catch (\Throwable $e) {
                $result->recordFailure($id, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<int>  $ids
     */
    public function deleteAvailability(User $auth, Room $room, array $ids): BulkDeleteResult
    {
        $result = new BulkDeleteResult;

        foreach ($this->capIds($ids) as $id) {
            $availability = RoomAvailability::query()
                ->where('room_id', $room->id)
                ->whereKey($id)
                ->first();

            if (! $availability) {
                $result->recordFailure($id, 'Availability block not found.');

                continue;
            }

            try {
                Gate::forUser($auth)->authorize('update', $room);
                $this->rooms->deleteAvailability($room, $availability);
                $result->recordSuccess();
            } catch (AuthorizationException $e) {
                $result->recordFailure($id, $e->getMessage() ?: 'Not allowed.');
            } catch (\Throwable $e) {
                $result->recordFailure($id, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<int>  $roomIds
     */
    public function deleteGuestFavorites(User $guest, array $roomIds): BulkDeleteResult
    {
        if ($guest->role !== 'guest') {
            throw new AuthorizationException('Guests only.');
        }

        $result = new BulkDeleteResult;

        foreach ($this->capIds($roomIds) as $roomId) {
            $room = Room::withoutGlobalScopes()
                ->whereKey($roomId)
                ->where('resort_id', $guest->home_resort_id)
                ->first();

            if (! $room) {
                $result->recordFailure($roomId, 'Room not found.');

                continue;
            }

            try {
                $deleted = GuestFavoriteRoom::query()
                    ->where('user_id', $guest->id)
                    ->where('room_id', $room->id)
                    ->delete();

                if ($deleted > 0) {
                    $result->recordSuccess();
                } else {
                    $result->recordFailure($roomId, 'Favorite not found.');
                }
            } catch (\Throwable $e) {
                $result->recordFailure($roomId, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<int>  $ids
     * @return list<int>
     */
    private function capIds(array $ids): array
    {
        $normalized = [];
        foreach ($ids as $id) {
            $int = (int) $id;
            if ($int > 0) {
                $normalized[$int] = $int;
            }
        }

        return array_slice(array_values($normalized), 0, self::MAX_BATCH);
    }

    private function authorizeResortAccess(User $user, Resort $resort): void
    {
        if ($user->role === 'admin') {
            return;
        }

        $tenantId = TenantContext::tenantId() ?? $user->tenant_id;
        if ($tenantId && (int) $resort->tenant_id !== (int) $tenantId) {
            throw new AuthorizationException('Access denied.');
        }
    }
}
