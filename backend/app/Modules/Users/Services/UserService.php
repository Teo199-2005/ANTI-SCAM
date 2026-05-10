<?php

namespace App\Modules\Users\Services;

use App\Models\User;
use App\Modules\Users\Repositories\UserRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class UserService
{
    public function __construct(private readonly UserRepositoryInterface $users) {}

    public function list(int $perPage = 10, ?string $search = null, ?string $sortBy = null, ?string $sortDir = null): LengthAwarePaginator
    {
        return $this->users->paginate($perPage, $search, $sortBy, $sortDir);
    }

    public function find(int $id): User
    {
        return $this->users->findOrFail($id);
    }

    public function create(array $attributes): User
    {
        return $this->users->create($attributes);
    }

    public function update(User $user, array $attributes): User
    {
        return $this->users->update($user, $attributes);
    }

    public function delete(User $user): void
    {
        $this->users->delete($user);
    }
}
