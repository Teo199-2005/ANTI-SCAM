<?php

namespace App\Policies;

use App\Models\Resort;
use App\Models\User;

class ResortPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'resort_owner'], true);
    }

    public function view(User $user, Resort $resort): bool
    {
        return $user->role === 'admin' || $user->tenant_id === $resort->tenant_id;
    }

    public function create(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function update(User $user, Resort $resort): bool
    {
        return $user->role === 'admin' || ($user->role === 'resort_owner' && $user->tenant_id === $resort->tenant_id);
    }

    public function delete(User $user, Resort $resort): bool
    {
        return $user->role === 'admin' || ($user->role === 'resort_owner' && $user->tenant_id === $resort->tenant_id);
    }
}
