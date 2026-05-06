<?php

namespace App\Policies;

use App\Models\Room;
use App\Models\User;

class RoomPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'admin_staff', 'resort_owner'], true);
    }

    public function view(User $user, Room $room): bool
    {
        return $user->role === 'admin' || $user->tenant_id === $room->tenant_id;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'resort_owner'], true);
    }

    public function update(User $user, Room $room): bool
    {
        return in_array($user->role, ['admin', 'resort_owner'], true)
            && ($user->role === 'admin' || $user->tenant_id === $room->tenant_id);
    }

    public function delete(User $user, Room $room): bool
    {
        return $this->update($user, $room);
    }
}
