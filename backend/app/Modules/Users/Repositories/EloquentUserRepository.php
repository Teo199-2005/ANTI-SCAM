<?php

namespace App\Modules\Users\Repositories;

use App\Models\User;
use App\Support\ResortLocationQuery;
use App\Support\SafeSort;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;

class EloquentUserRepository implements UserRepositoryInterface
{
    public function paginate(
        int $perPage = 10,
        ?string $search = null,
        ?string $sortBy = null,
        ?string $sortDir = null,
        ?string $role = null,
        ?string $provincePsgc = null,
        ?string $cityPsgc = null,
    ): LengthAwarePaginator {
        $query = User::query()
            ->when($search, fn ($q) => $q->where(function ($inner) use ($search): void {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->when(filled($role), fn ($q) => $q->where('role', $role));

        if ($provincePsgc !== null || $cityPsgc !== null) {
            if ($role === 'marketing') {
                ResortLocationQuery::applyToUserMailingColumns($query, $provincePsgc, $cityPsgc);
            } elseif ($role === 'resort_owner' || $role === null) {
                ResortLocationQuery::whereUserTenantHasResortLocation($query, $provincePsgc, $cityPsgc);
            }
        }

        SafeSort::apply($query, $sortBy, $sortDir, ['name', 'email', 'role', 'created_at'], 'created_at', 'desc');

        return $query->paginate($perPage);
    }

    public function findOrFail(int $id): User
    {
        return User::findOrFail($id);
    }

    public function create(array $attributes): User
    {
        $attributes['password'] = Hash::make($attributes['password']);
        return User::create($attributes);
    }

    public function update(User $user, array $attributes): User
    {
        if (! empty($attributes['password'])) {
            $attributes['password'] = Hash::make($attributes['password']);
        } else {
            unset($attributes['password']);
        }

        $user->update($attributes);
        return $user->refresh();
    }

    public function delete(User $user): void
    {
        $user->delete();
    }
}
