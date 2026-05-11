<?php

namespace App\Policies;

use App\Models\Reservation;
use App\Models\User;

class ReservationPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'admin_staff', 'resort_owner', 'client', 'user'], true);
    }

    public function view(User $user, Reservation $reservation): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        if (in_array($user->role, ['admin_staff', 'resort_owner'], true)) {
            return (int) $user->tenant_id === (int) $reservation->tenant_id;
        }

        return $reservation->client_id === $user->id;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'client', 'user'], true);
    }

    public function cancel(User $user, Reservation $reservation): bool
    {
        return $user->role === 'admin' || $reservation->client_id === $user->id;
    }

    public function adminOverride(User $user): bool
    {
        return $user->role === 'admin';
    }

    /** Resort staff: mark confirmed stays as completed or no-show. */
    public function updateResortLifecycle(User $user, Reservation $reservation): bool
    {
        if (! in_array($user->role, ['resort_owner', 'admin_staff'], true)) {
            return false;
        }

        return (int) $user->tenant_id === (int) $reservation->tenant_id;
    }
}
