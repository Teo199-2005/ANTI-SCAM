<?php

namespace App\Modules\Users\Services;

use App\Models\User;
use App\Modules\Users\Repositories\UserRepositoryInterface;
use App\Services\MarketerBookingCommissionRateService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class UserService
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly MarketerBookingCommissionRateService $marketerCommissionRates,
    ) {}

    public function list(
        int $perPage = 10,
        ?string $search = null,
        ?string $sortBy = null,
        ?string $sortDir = null,
        ?string $role = null,
        ?string $provincePsgc = null,
        ?string $cityPsgc = null,
    ): LengthAwarePaginator {
        return $this->users->paginate($perPage, $search, $sortBy, $sortDir, $role, $provincePsgc, $cityPsgc);
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
        if (array_key_exists('booking_commission_php', $attributes)) {
            $targetRole = (string) ($attributes['role'] ?? $user->role);
            if ($targetRole !== 'marketing') {
                $attributes['booking_commission_php'] = null;
            } else {
                $attributes['booking_commission_php'] = $this->marketerCommissionRates->normalizeOverrideForStorage(
                    $attributes['booking_commission_php'],
                );
            }
        } elseif (isset($attributes['role']) && $attributes['role'] !== 'marketing') {
            $attributes['booking_commission_php'] = null;
        }

        return $this->users->update($user, $attributes);
    }

    public function delete(User $user): void
    {
        $this->users->delete($user);
    }
}
