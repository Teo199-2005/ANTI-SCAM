<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\Tenant;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PublicCatalogVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PsgcReferenceSeeder::class);
    }

    private function createActiveSubscription(int $tenantId, int $resortId): void
    {
        Subscription::create([
            'tenant_id' => $tenantId,
            'resort_id' => $resortId,
            'plan' => 'standard',
            'status' => 'active',
            'base_price' => 0,
            'included_rooms' => 5,
            'extra_room_fee' => 0,
            'active_room_count' => 0,
            'total_monthly_fee' => 0,
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);
    }

    public function test_public_catalog_excludes_listed_but_unverified_resorts(): void
    {
        $tenant = Tenant::create([
            'name' => 'Unverified Tenant',
            'slug' => 'unverified-resort',
            'subdomain' => 'unverified-resort',
            'status' => 'active',
        ]);
        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Unverified Listed Resort',
            'is_publicly_listed' => true,
            'verification_status' => 'pending',
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_name' => 'Demo',
            'address_street_line' => '1 Main',
        ]);
        $this->createActiveSubscription($tenant->id, $resort->id);

        $verifiedTenant = Tenant::create([
            'name' => 'Verified Tenant',
            'slug' => 'verified-resort',
            'subdomain' => 'verified-resort',
            'status' => 'active',
        ]);
        $verified = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $verifiedTenant->id,
            'name' => 'Verified Resort',
            'is_publicly_listed' => true,
            'verification_status' => 'verified',
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_name' => 'Demo',
            'address_street_line' => '2 Main',
        ]);
        $this->createActiveSubscription($verifiedTenant->id, $verified->id);

        $response = $this->getJson('/api/v1/public/resorts');

        $response->assertOk();
        $names = collect($response->json('data.data'))->pluck('name')->all();
        $this->assertContains('Verified Resort', $names);
        $this->assertNotContains('Unverified Listed Resort', $names);
    }

    public function test_resort_by_slug_returns_404_when_not_verified(): void
    {
        $tenant = Tenant::create([
            'name' => 'Hidden Tenant',
            'slug' => 'hidden-resort',
            'subdomain' => 'hidden-resort',
            'status' => 'active',
        ]);
        Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Hidden',
            'is_publicly_listed' => true,
            'verification_status' => 'pending',
        ]);

        $this->getJson('/api/v1/public/resorts/slug/hidden-resort')
            ->assertStatus(404);
    }
}
