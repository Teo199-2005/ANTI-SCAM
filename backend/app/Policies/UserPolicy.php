<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $authUser): bool
    {
        return $authUser->role === 'admin';
    }

    public function view(User $authUser, User $user): bool
    {
        return $authUser->role === 'admin' || $authUser->id === $user->id;
    }

    public function create(User $authUser): bool
    {
        return $authUser->role === 'admin';
    }

    public function update(User $authUser, User $user): bool
    {
        return $authUser->role === 'admin' || $authUser->id === $user->id;
    }

    public function delete(User $authUser, User $user): bool
    {
        return $authUser->role === 'admin' && $authUser->id !== $user->id;
    }
}
