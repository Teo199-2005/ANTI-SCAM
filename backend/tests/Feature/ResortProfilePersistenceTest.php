<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResortProfilePersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_put_resort_persists_background_representatives_policy_and_amenities(): void
    {
        $this->seed(PsgcReferenceSeeder::class);

        $tenant = Tenant::create([
            'name' => 'Persist Tenant',
            'slug' => 'persist-tenant',
            'subdomain' => 'persisttest',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Persist Resort',
            'description' => 'Before',
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
            'address_label' => null,
            'contact_number' => '+63000000000',
            'is_publicly_listed' => true,
        ]);

        Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2000,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 0,
            'total_monthly_fee' => 2000,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);

        Sanctum::actingAs($owner);

        $response = $this->putJson("/api/v1/resorts/{$resort->id}", [
            'background_image_url' => '/storage/resort-backgrounds/test-bg.jpg',
            'representative_name' => 'Representative One',
            'representative_contact_number' => '+639171234567',
            'cancellation_policy' => 'Free cancellation up to 48 hours.',
            'amenities' => ['Pool', 'Free Wi-Fi'],
            'facebook_url' => 'https://facebook.com/myresort',
            'instagram_url' => 'instagram.com/myresort',
            'tiktok_url' => 'https://www.tiktok.com/@myresort',
        ]);

        $response->assertOk();

        $resort->refresh();

        $this->assertSame('/storage/resort-backgrounds/test-bg.jpg', $resort->background_image_url);
        $this->assertSame('Representative One', $resort->representative_name);
        $this->assertSame('+639171234567', $resort->representative_contact_number);
        $this->assertSame('Free cancellation up to 48 hours.', $resort->cancellation_policy);
        $this->assertSame(['Pool', 'Free Wi-Fi'], $resort->amenities);
        $this->assertSame('https://facebook.com/myresort', $resort->facebook_url);
        $this->assertSame('https://instagram.com/myresort', $resort->instagram_url);
        $this->assertSame('https://www.tiktok.com/@myresort', $resort->tiktok_url);
    }

    public function test_put_resort_without_name_still_resyncs_tenant_subdomain_from_db_resort_name(): void
    {
        $this->seed(PsgcReferenceSeeder::class);

        $tenant = Tenant::create([
            'name' => 'Owner Name',
            'slug' => 'teofilo-harry-paet-w1scd1',
            'subdomain' => 'teofilo-harry-paet-w1scd1',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'TEO',
            'description' => 'Test',
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
            'address_label' => null,
            'contact_number' => '+63000000000',
            'is_publicly_listed' => true,
        ]);

        Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2000,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 0,
            'total_monthly_fee' => 2000,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);

        Sanctum::actingAs($owner);

        $response = $this->putJson("/api/v1/resorts/{$resort->id}", [
            'cancellation_policy' => 'Updated policy only',
        ]);

        $response->assertOk();

        $tenant->refresh();
        $this->assertSame('teo', $tenant->subdomain);
        $this->assertSame('teo', $tenant->slug);
    }
}
