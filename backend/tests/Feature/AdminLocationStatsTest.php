<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminLocationStatsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PsgcReferenceSeeder::class);
    }

    public function test_non_admin_cannot_access_location_stats(): void
    {
        $owner = User::factory()->create(['role' => 'resort_owner']);
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/admin/location-stats')->assertForbidden();
    }

    public function test_admin_location_stats_returns_breakdown_and_filtered_totals(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $tenant = Tenant::create([
            'name' => 'Loc Tenant',
            'slug' => 'loc-tenant',
            'subdomain' => 'loc-tenant',
            'status' => 'active',
        ]);

        User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $tenant->id,
        ]);

        Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Located Resort',
            'is_publicly_listed' => true,
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
        ]);

        Resort::withoutGlobalScopes()->create([
            'tenant_id' => Tenant::create([
                'name' => 'Other',
                'slug' => 'other-tenant',
                'subdomain' => 'other-tenant',
                'status' => 'active',
            ])->id,
            'name' => 'No Address Resort',
            'is_publicly_listed' => false,
        ]);

        $this->getJson('/api/v1/admin/location-stats')
            ->assertSuccessful()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'by_province',
                    'by_city',
                    'filtered_totals' => ['resort_count', 'owner_count'],
                ],
            ])
            ->assertJsonPath('data.filtered_totals.resort_count', 2)
            ->assertJsonPath('data.filtered_totals.owner_count', 1);

        $this->getJson('/api/v1/admin/location-stats?'.http_build_query([
            'province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
        ]))
            ->assertSuccessful()
            ->assertJsonPath('data.filtered_totals.resort_count', 1)
            ->assertJsonPath('data.filtered_totals.owner_count', 1);
    }

    public function test_admin_resort_list_filters_by_province_psgc(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $tenantA = Tenant::create([
            'name' => 'A',
            'slug' => 'tenant-a',
            'subdomain' => 'tenant-a',
            'status' => 'active',
        ]);
        $tenantB = Tenant::create([
            'name' => 'B',
            'slug' => 'tenant-b',
            'subdomain' => 'tenant-b',
            'status' => 'active',
        ]);

        Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenantA->id,
            'name' => 'Abra Resort',
            'is_publicly_listed' => true,
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
        ]);

        Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'name' => 'Elsewhere Resort',
            'is_publicly_listed' => true,
        ]);

        $this->getJson('/api/v1/resorts?'.http_build_query([
            'province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'perPage' => 50,
        ]))
            ->assertSuccessful()
            ->assertJsonPath('success', true)
            ->assertJsonFragment(['name' => 'Abra Resort'])
            ->assertJsonMissing(['name' => 'Elsewhere Resort']);
    }
}
