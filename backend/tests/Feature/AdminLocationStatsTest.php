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
                    'top_resorts',
                    'filtered_totals' => ['resort_count', 'owner_count'],
                ],
            ])
            ->assertJsonPath('data.top_resorts.0.location_label', 'Bangued, Abra')
            ->assertJsonPath('data.top_resorts.0.resort_count', 1)
            ->assertJsonPath('data.filtered_totals.resort_count', 2)
            ->assertJsonPath('data.filtered_totals.owner_count', 1);

        $this->getJson('/api/v1/admin/location-stats?'.http_build_query([
            'province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
        ]))
            ->assertSuccessful()
            ->assertJsonPath('data.filtered_totals.resort_count', 1)
            ->assertJsonPath('data.filtered_totals.owner_count', 1);
    }

    public function test_location_stats_resolves_barangay_psgc_when_saved_in_city_field(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $tenant = Tenant::create([
            'name' => 'Barangay City Tenant',
            'slug' => 'br-city-tenant',
            'subdomain' => 'br-city-tenant',
            'status' => 'active',
        ]);

        User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $tenant->id,
        ]);

        Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Mis-keyed City Code Resort',
            'is_publicly_listed' => true,
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
        ]);

        $this->getJson('/api/v1/admin/location-stats')
            ->assertSuccessful()
            ->assertJsonFragment(['location_label' => 'Bangued, Abra']);
    }

    public function test_location_stats_uses_resort_address_label_when_psgc_reference_missing(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $tenant = Tenant::create([
            'name' => 'Off-catalog PSGC',
            'slug' => 'off-catalog-psgc',
            'subdomain' => 'off-catalog-psgc',
            'status' => 'active',
        ]);

        User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $tenant->id,
        ]);

        Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Catalog mismatch resort',
            'is_publicly_listed' => true,
            'address_province_psgc' => '9999999999',
            'address_city_municipality_psgc' => '9999999998',
            'address_label' => 'Baybay, Leyte',
        ]);

        $this->getJson('/api/v1/admin/location-stats')
            ->assertSuccessful()
            ->assertJsonFragment(['location_label' => 'Baybay, Leyte']);
    }

    public function test_location_stats_strips_barangay_prefix_when_it_matches_profile_barangay(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $tenant = Tenant::create([
            'name' => 'Barangay prefix tenant',
            'slug' => 'brgy-prefix-tenant',
            'subdomain' => 'brgy-prefix-tenant',
            'status' => 'active',
        ]);

        User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $tenant->id,
        ]);

        Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Barangay prefix resort',
            'is_publicly_listed' => true,
            'address_street_line' => null,
            'address_barangay_name' => 'Mabini street',
            'address_province_psgc' => '7777777777',
            'address_city_municipality_psgc' => '7777777776',
            'address_label' => 'Mabini street, City of Cauayan, Isabela',
        ]);

        $this->getJson('/api/v1/admin/location-stats')
            ->assertSuccessful()
            ->assertJsonFragment(['location_label' => 'City of Cauayan, Isabela']);
    }

    public function test_location_stats_strips_street_prefix_from_address_label_for_display(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $tenant = Tenant::create([
            'name' => 'Street Prefix Tenant',
            'slug' => 'street-prefix-tenant',
            'subdomain' => 'street-prefix-tenant',
            'status' => 'active',
        ]);

        User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $tenant->id,
        ]);

        Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Street prefix resort',
            'is_publicly_listed' => true,
            'address_street_line' => 'Mabini Street. District 1',
            'address_province_psgc' => '8888888888',
            'address_city_municipality_psgc' => '8888888887',
            'address_label' => 'Mabini Street. District 1, Calipayan, Baybay, Leyte',
        ]);

        $this->getJson('/api/v1/admin/location-stats')
            ->assertSuccessful()
            ->assertJsonFragment(['location_label' => 'Baybay, Leyte']);
    }

    public function test_location_stats_uses_province_display_hint_when_reference_missing(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $tenant = Tenant::create([
            'name' => 'Hint Tenant',
            'slug' => 'hint-tenant',
            'subdomain' => 'hint-tenant',
            'status' => 'active',
        ]);

        User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $tenant->id,
        ]);

        $offCatalogProvince = '1122334455';
        $offCatalogCity = '1122334454';

        Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'No label resort',
            'is_publicly_listed' => true,
            'address_province_psgc' => $offCatalogProvince,
            'address_city_municipality_psgc' => $offCatalogCity,
            'address_label' => null,
            'address_street_line' => null,
            'address_barangay_name' => null,
        ]);

        $query = http_build_query([
            'province_psgc' => $offCatalogProvince,
            'city_municipality_psgc' => $offCatalogCity,
            'province_display' => 'Isabela',
            'city_display' => 'City of Cauayan',
        ]);

        $this->getJson('/api/v1/admin/location-stats?'.$query)
            ->assertSuccessful()
            ->assertJsonPath('data.by_city.0.province_name', 'Isabela')
            ->assertJsonPath('data.top_resorts.0.location_label', 'City of Cauayan, Isabela');
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
