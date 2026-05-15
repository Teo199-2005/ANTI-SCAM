<?php

namespace App\Modules\Users\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface UserRepositoryInterface
{
    public function paginate(
        int $perPage = 10,
        ?string $search = null,
        ?string $sortBy = null,
        ?string $sortDir = null,
        ?string $role = null,
        ?string $provincePsgc = null,
        ?string $cityPsgc = null,
    ): LengthAwarePaginator;
    public function findOrFail(int $id): User;
    public function create(array $attributes): User;
    public function update(User $user, array $attributes): User;
    public function delete(User $user): void;
}
