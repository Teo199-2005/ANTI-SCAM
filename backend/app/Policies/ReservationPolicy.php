<?php

namespace App\Policies;

use App\Models\Reservation;
use App\Models\User;

class ReservationPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'admin_staff', 'resort_owner', 'client', 'user', 'guest'], true);
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
        return in_array($user->role, ['admin', 'client', 'user', 'guest'], true);
    }

    /** Walk-in / desk bookings created by the resort owner (no payment gateway). */
    public function createManual(User $user): bool
    {
        return $user->role === 'resort_owner';
    }

    public function updateManual(User $user, Reservation $reservation): bool
    {
        if ($user->role !== 'resort_owner') {
            return false;
        }

        return (int) $user->tenant_id === (int) $reservation->tenant_id
            && ($reservation->booking_source ?? 'online') === 'manual';
    }

    public function cancelByResort(User $user, Reservation $reservation): bool
    {
        if ($user->role !== 'resort_owner') {
            return false;
        }

        return (int) $user->tenant_id === (int) $reservation->tenant_id
            && ($reservation->booking_source ?? 'online') === 'manual';
    }

    public function cancel(User $user, Reservation $reservation): bool
    {
        return $user->role === 'admin'
            || ($reservation->client_id === $user->id && in_array($user->role, ['client', 'user', 'guest'], true));
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
