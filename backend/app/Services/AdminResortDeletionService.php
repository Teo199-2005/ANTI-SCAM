<?php

namespace App\Services;

use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Users\Services\UserService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class AdminResortDeletionService
{
    /** @var list<string> */
    private const TENANT_STAFF_ROLES = ['resort_owner', 'admin_staff'];

    public function __construct(private readonly UserService $users) {}

    public function deleteResortWithWorkspace(User $auth, Resort $resort): void
    {
        Gate::forUser($auth)->authorize('delete', $resort);

        DB::transaction(function () use ($auth, $resort): void {
            $tenantId = (int) $resort->tenant_id;

            $resort->delete();

            if (Resort::query()->where('tenant_id', $tenantId)->exists()) {
                return;
            }

            User::query()
                ->where('tenant_id', $tenantId)
                ->whereIn('role', self::TENANT_STAFF_ROLES)
                ->orderBy('id')
                ->each(function (User $staff) use ($auth): void {
                    if ($staff->id === $auth->id) {
                        return;
                    }

                    Gate::forUser($auth)->authorize('delete', $staff);
                    $this->users->delete($staff);
                });

            Tenant::query()->whereKey($tenantId)->delete();
        });
    }
}
