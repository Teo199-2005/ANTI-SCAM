<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Idempotent demo accounts for /login quick access (password: "password").
 * Does not depend on FullDashboardDemoSeeder — safe when the big seeder failed partway.
 */
class DemoLoginAccountsSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@resort.test'],
            [
                'tenant_id' => null,
                'name' => 'Platform Admin',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ],
        );

        $tenant = Tenant::query()->orderBy('id')->first();
        if (! $tenant) {
            $tenant = Tenant::query()->create([
                'name' => 'Demo Tenant',
                'slug' => 'demo-tenant',
                'subdomain' => 'demo',
                'status' => 'active',
            ]);
        }

        User::query()->updateOrCreate(
            ['email' => 'owner@resort.test'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Resort Owner',
                'password' => Hash::make('password'),
                'role' => 'resort_owner',
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'guest@resort.test'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Guest User',
                'password' => Hash::make('password'),
                'role' => 'client',
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'user@resort.test'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Demo User',
                'password' => Hash::make('password'),
                'role' => 'user',
                'email_verified_at' => now(),
            ],
        );
    }
}
