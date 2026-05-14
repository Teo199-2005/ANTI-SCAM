<?php

namespace Database\Seeders;

use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Subscriptions\Services\SubscriptionService;
use Illuminate\Database\Seeder;

/**
 * Idempotent demo accounts for /login quick access (password: "password").
 * Does not depend on FullDashboardDemoSeeder — safe when the big seeder failed partway.
 *
 * Assign plaintext passwords — the User model casts `password` with `hashed`.
 */
class DemoLoginAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(PsgcReferenceSeeder::class);

        User::query()->updateOrCreate(
            ['email' => 'admin@resort.test'],
            [
                'tenant_id' => null,
                'name' => 'Platform Admin',
                'password' => 'password',
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
                'password' => 'password',
                'role' => 'resort_owner',
                'email_verified_at' => now(),
            ],
        );

        // Demo owner needs at least one resort row (same as post-onboarding state).
        if (! Resort::withoutGlobalScopes()->where('tenant_id', $tenant->id)->exists()) {
            $resort = Resort::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'name' => 'Demo Resort',
                'description' => 'Seeded demo property for dashboard testing.',
                'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
                'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
                'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
                'address_label' => null,
                'contact_number' => '+63 917 874 4889',
                'is_publicly_listed' => true,
            ]);
            app(\App\Services\PhilippineLocationService::class)->syncResortAddressLabel($resort);
            $resort->refresh();
            if ($resort->address_label === null || trim((string) $resort->address_label) === '') {
                $resort->forceFill([
                    'address_label' => 'Tagaytay City, Cavite, Philippines',
                ])->saveQuietly();
            }
            app(SubscriptionService::class)->refreshForResort($resort, 'basic');
        }

        User::query()->updateOrCreate(
            ['email' => 'guest@resort.test'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Guest User',
                'password' => 'password',
                'role' => 'client',
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'user@resort.test'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Demo User',
                'password' => 'password',
                'role' => 'user',
                'email_verified_at' => now(),
            ],
        );

        // Same marketer as MarketingPartnerDemoSeeder — so `db:seed --class=DemoLoginAccountsSeeder`
        // restores every email shown on the login demo panel (admin / owner / marketing).
        User::query()->updateOrCreate(
            ['email' => 'marketer@resort.test'],
            [
                'tenant_id' => null,
                'name' => 'Ana Rodriguez',
                'password' => 'password',
                'role' => 'marketing',
                'referral_code' => 'RODRIGUEZ8391',
                'email_verified_at' => now(),
            ],
        );

        // Custom referral code for demo / stakeholder login (normalized as CHARLIE01 at validation).
        User::query()->updateOrCreate(
            ['email' => 'charlie.santiago@resort.test'],
            [
                'tenant_id' => null,
                'name' => 'Charlie Santiago',
                'password' => 'password',
                'role' => 'marketing',
                'referral_code' => 'CHARLIE01',
                'email_verified_at' => now(),
            ],
        );
    }
}
