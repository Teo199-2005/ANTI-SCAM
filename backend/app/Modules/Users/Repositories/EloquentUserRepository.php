<?php

namespace App\Modules\Users\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;

class EloquentUserRepository implements UserRepositoryInterface
{
    public function paginate(int $perPage = 10, ?string $search = null): LengthAwarePaginator
    {
        return User::query()
            ->when($search, fn ($query) => $query->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"))
            ->latest()
            ->paginate($perPage);
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
