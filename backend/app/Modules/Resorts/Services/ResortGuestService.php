<?php

namespace App\Modules\Resorts\Services;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\User;
use App\Support\ResortGuestKey;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ResortGuestService
{
    public function primaryResortForTenant(int $tenantId): ?Resort
    {
        return Resort::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->orderBy('id')
            ->first();
    }

    public function guestKeyForUser(User $user): string
    {
        return mb_strtolower(trim((string) $user->email));
    }

    /**
     * @return Builder<Reservation>
     */
    public function reservationsMatchingKey(int $tenantId, string $guestKey): Builder
    {
        $guestKey = rawurldecode($guestKey);

        return Reservation::withoutGlobalScopes()
            ->from('reservations')
            ->leftJoin('users', 'users.id', '=', 'reservations.client_id')
            ->where('reservations.tenant_id', $tenantId)
            ->whereRaw('('.ResortGuestKey::sqlExpression().') = ?', [$guestKey])
            ->select('reservations.*');
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function updateReservationsForGuestKey(int $tenantId, string $guestKey, array $attributes): void
    {
        $ids = $this->reservationsMatchingKey($tenantId, $guestKey)->pluck('reservations.id');

        if ($ids->isEmpty()) {
            return;
        }

        Reservation::withoutGlobalScopes()
            ->whereIn('id', $ids)
            ->update($attributes);
    }

    public function findGuestUserForKey(int $tenantId, string $guestKey): ?User
    {
        $guestKey = rawurldecode($guestKey);

        foreach ($this->linkedDirectoryUsersForKey($tenantId, $guestKey) as $user) {
            return $user;
        }

        $resortIds = Resort::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->pluck('id');

        if ($resortIds->isEmpty()) {
            return null;
        }

        if (ctype_digit($guestKey)) {
            $byClient = User::query()->find((int) $guestKey);
            if ($this->isDirectoryGuestUser($byClient)) {
                return $byClient;
            }
        }

        $email = mb_strtolower(trim($guestKey));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        return User::query()
            ->whereIn('role', ['guest', 'client', 'user'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->where(function ($q) use ($resortIds, $tenantId): void {
                $q->whereIn('home_resort_id', $resortIds)
                    ->orWhereExists(function ($sub) use ($tenantId): void {
                        $sub->selectRaw('1')
                            ->from('reservations')
                            ->whereColumn('reservations.client_id', 'users.id')
                            ->where('reservations.tenant_id', $tenantId);
                    });
            })
            ->first();
    }

    /**
     * @return list<User>
     */
    private function linkedDirectoryUsersForKey(int $tenantId, string $guestKey): array
    {
        $clientIds = $this->reservationsMatchingKey($tenantId, $guestKey)
            ->whereNotNull('client_id')
            ->distinct()
            ->pluck('client_id');

        $users = [];
        foreach ($clientIds as $clientId) {
            $user = User::query()->find((int) $clientId);
            if ($this->isDirectoryGuestUser($user)) {
                $users[] = $user;
            }
        }

        return $users;
    }

    private function isDirectoryGuestUser(?User $user): bool
    {
        return $user !== null && in_array($user->role, ['guest', 'client', 'user'], true);
    }

    private function isProtectedStaffUser(User $user): bool
    {
        return in_array($user->role, ['admin', 'resort_owner', 'marketing', 'admin_staff'], true);
    }

    /**
     * @return array<string, mixed>
     */
    public function show(int $tenantId, string $guestKey): array
    {
        $guestKey = rawurldecode($guestKey);
        $reservations = $this->reservationsMatchingKey($tenantId, $guestKey);
        $user = $this->findGuestUserForKey($tenantId, $guestKey);
        $revIn = Reservation::revenueEligibleStatusesSqlList();

        $stats = (clone $reservations)
            ->selectRaw("
                COUNT(*) AS reservation_count,
                SUM(CASE WHEN status IN ({$revIn}) THEN COALESCE(reservation_fee, 0) ELSE 0 END) AS total_spent,
                MAX(check_in_date) AS last_check_in,
                MAX(check_out_date) AS last_check_out,
                MIN(DATE(created_at)) AS first_booking
            ")
            ->first();

        $name = $user?->name;
        $email = $user?->email;
        $phone = $user?->phone;

        if ($stats && (int) $stats->reservation_count > 0) {
            $row = DB::table('reservations')
                ->leftJoin('users', 'users.id', '=', 'reservations.client_id')
                ->where('reservations.tenant_id', $tenantId)
                ->whereExists(function ($sub) use ($tenantId, $guestKey): void {
                    $keyExprSub = str_replace(
                        ['reservations.', 'users.'],
                        ['reservations_sub.', 'users_sub.'],
                        ResortGuestKey::sqlExpression()
                    );
                    $sub->selectRaw('1')
                        ->from('reservations as reservations_sub')
                        ->leftJoin('users as users_sub', 'users_sub.id', '=', 'reservations_sub.client_id')
                        ->whereColumn('reservations_sub.id', 'reservations.id')
                        ->where('reservations_sub.tenant_id', $tenantId)
                        ->whereRaw('('.$keyExprSub.') = ?', [$guestKey]);
                })
                ->selectRaw("
                    MAX(COALESCE(NULLIF(reservations.guest_name, ''), users.name)) AS name,
                    MAX(COALESCE(NULLIF(reservations.guest_email, ''), users.email)) AS email,
                    MAX(COALESCE(NULLIF(reservations.guest_phone, ''), users.phone)) AS phone
                ")
                ->first();

            $name = $name ?? ($row->name ?? null);
            $email = $email ?? ($row->email ?? null);
            $phone = $phone ?? ($row->phone ?? null);
        }

        if (! $user && ((int) ($stats->reservation_count ?? 0)) === 0) {
            throw ValidationException::withMessages([
                'guestKey' => ['Guest not found.'],
            ]);
        }

        return [
            'guestKey' => $user ? $this->guestKeyForUser($user) : $guestKey,
            'name' => (string) ($name ?? 'Guest'),
            'email' => $email,
            'phone' => $phone,
            'reservationCount' => (int) ($stats->reservation_count ?? 0),
            'totalSpent' => (float) ($stats->total_spent ?? 0),
            'lastCheckIn' => $stats->last_check_in ?? null,
            'lastCheckOut' => $stats->last_check_out ?? null,
            'firstBooking' => $stats->first_booking ?? null,
            'userId' => $user?->id,
            'hasLoginAccount' => $user !== null,
        ];
    }

    /**
     * @param  array{name: string, email: string, phone?: string|null, password: string}  $data
     * @return array<string, mixed>
     */
    public function store(int $tenantId, array $data): array
    {
        $resort = $this->primaryResortForTenant($tenantId);
        if (! $resort) {
            throw ValidationException::withMessages([
                'resort' => ['No resort found for this workspace.'],
            ]);
        }

        $email = mb_strtolower(trim($data['email']));
        if (User::query()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
            throw ValidationException::withMessages([
                'email' => ['An account with this email already exists.'],
            ]);
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $email,
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'role' => 'guest',
            'home_resort_id' => $resort->id,
            'terms_accepted_at' => now(),
        ]);

        $this->linkReservationsToUser($tenantId, $email, $user);

        return $this->show($tenantId, $this->guestKeyForUser($user));
    }

    /**
     * @param  array{name?: string, email?: string, phone?: string|null, password?: string}  $data
     * @return array<string, mixed>
     */
    public function update(int $tenantId, string $guestKey, array $data): array
    {
        $guestKey = rawurldecode($guestKey);
        $user = $this->findGuestUserForKey($tenantId, $guestKey);
        $reservations = $this->reservationsMatchingKey($tenantId, $guestKey);

        if (! $user && $reservations->count() === 0) {
            throw ValidationException::withMessages([
                'guestKey' => ['Guest not found.'],
            ]);
        }

        $newEmail = isset($data['email']) ? mb_strtolower(trim((string) $data['email'])) : null;
        if ($newEmail && User::query()
            ->whereRaw('LOWER(email) = ?', [$newEmail])
            ->when($user, fn ($q) => $q->where('id', '!=', $user->id))
            ->exists()) {
            throw ValidationException::withMessages([
                'email' => ['An account with this email already exists.'],
            ]);
        }

        $reservationUpdates = [];
        if (isset($data['name'])) {
            $reservationUpdates['guest_name'] = $data['name'];
        }
        if (array_key_exists('phone', $data)) {
            $reservationUpdates['guest_phone'] = $data['phone'];
        }
        if ($newEmail) {
            $reservationUpdates['guest_email'] = $newEmail;
        }

        if ($reservationUpdates !== []) {
            $this->updateReservationsForGuestKey($tenantId, $guestKey, $reservationUpdates);
        }

        if ($user) {
            $userUpdates = [];
            if (isset($data['name'])) {
                $userUpdates['name'] = $data['name'];
            }
            if (array_key_exists('phone', $data)) {
                $userUpdates['phone'] = $data['phone'];
            }
            if ($newEmail) {
                $userUpdates['email'] = $newEmail;
            }
            if (! empty($data['password'])) {
                $userUpdates['password'] = Hash::make($data['password']);
            }
            if ($userUpdates !== []) {
                $user->update($userUpdates);
            }
        }

        $resolvedKey = $newEmail ?? ($user ? $this->guestKeyForUser($user->fresh()) : $guestKey);

        return $this->show($tenantId, $resolvedKey);
    }

    public function destroy(int $tenantId, string $guestKey): void
    {
        $guestKey = rawurldecode($guestKey);
        $user = $this->findGuestUserForKey($tenantId, $guestKey);
        $reservations = $this->reservationsMatchingKey($tenantId, $guestKey);

        if (! $user && $reservations->count() === 0) {
            throw ValidationException::withMessages([
                'guestKey' => ['Guest not found.'],
            ]);
        }

        $this->updateReservationsForGuestKey($tenantId, $guestKey, [
            'guest_name' => 'Removed guest',
            'guest_email' => null,
            'guest_phone' => null,
            'client_id' => null,
        ]);

        if ($user) {
            if ($this->isProtectedStaffUser($user)) {
                throw ValidationException::withMessages([
                    'guestKey' => ['This email belongs to a staff or owner account and cannot be removed from the guest directory.'],
                ]);
            }

            $user->tokens()->delete();

            try {
                $user->delete();
            } catch (\Throwable) {
                $user->forceFill([
                    'name' => 'Removed guest',
                    'email' => 'removed-guest-'.$user->id.'-'.Str::lower(Str::random(8)).'@invalid.local',
                    'phone' => null,
                    'password' => Hash::make(Str::random(32)),
                    'home_resort_id' => null,
                ])->save();
            }
        }
    }

    private function linkReservationsToUser(int $tenantId, string $email, User $user): void
    {
        Reservation::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where(function ($q) use ($email, $user): void {
                $q->whereRaw('LOWER(NULLIF(guest_email, \'\')) = ?', [$email])
                    ->orWhere('client_id', $user->id);
            })
            ->update([
                'client_id' => $user->id,
                'guest_name' => $user->name,
                'guest_email' => $email,
                'guest_phone' => $user->phone,
            ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function accountOnlyGuests(int $tenantId, array $existingKeys): array
    {
        $resortIds = Resort::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->pluck('id');

        if ($resortIds->isEmpty()) {
            return [];
        }

        $existing = array_fill_keys(array_map('strval', $existingKeys), true);

        return User::query()
            ->where('role', 'guest')
            ->whereIn('home_resort_id', $resortIds)
            ->orderBy('name')
            ->get()
            ->filter(function (User $user) use ($existing): bool {
                $key = mb_strtolower(trim((string) $user->email));

                return $key !== '' && ! isset($existing[$key]);
            })
            ->map(function (User $user): array {
                $key = $this->guestKeyForUser($user);

                return [
                    'id' => abs(crc32($key)),
                    'guestKey' => $key,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'reservationCount' => 0,
                    'totalSpent' => 0.0,
                    'lastCheckIn' => null,
                    'lastCheckOut' => null,
                    'firstBooking' => null,
                    'userId' => $user->id,
                    'hasLoginAccount' => true,
                ];
            })
            ->values()
            ->all();
    }
}
