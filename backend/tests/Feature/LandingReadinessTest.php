<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Room;
use App\Models\RoomImage;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\LandingReadinessService;
use App\Services\PhilippineLocationService;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LandingReadinessTest extends TestCase
{
    use RefreshDatabase;

    private LandingReadinessService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PsgcReferenceSeeder::class);
        $this->service = app(LandingReadinessService::class);
    }

    private static int $counter = 0;

    private function makeTenant(array $attrs = []): Tenant
    {
        self::$counter++;

        return Tenant::create(array_merge([
            'name' => 'Tenant '.self::$counter,
            'slug' => 'tenant-'.self::$counter,
            'subdomain' => 'tenant-'.self::$counter,
            'status' => 'active',
        ], $attrs));
    }

    private function makeResort(Tenant $tenant, array $attrs = []): Resort
    {
        return Resort::withoutGlobalScopes()->create(array_merge([
            'tenant_id' => $tenant->id,
            'name' => 'Test Resort',
            'is_publicly_listed' => true,
        ], $attrs));
    }

    private function makeSubscription(Resort $resort, string $status = 'active'): Subscription
    {
        return Subscription::create([
            'tenant_id' => $resort->tenant_id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2000,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 0,
            'total_monthly_fee' => 2000,
            'status' => $status,
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);
    }

    // ─── Readiness checker ───────────────────────────────────────────────────

    public function test_reports_missing_fields_for_incomplete_resort(): void
    {
        $tenant = $this->makeTenant();
        $resort = $this->makeResort($tenant, [
            'address_province_psgc' => null,
            'address_city_municipality_psgc' => null,
            'address_barangay_psgc' => null,
            'address_label' => null,
            'contact_number' => null,
            'logo_url' => null,
            'background_image_url' => null,
        ]);

        $result = $this->service->check($resort);

        $this->assertFalse($result['is_ready']);
        $this->assertContains('location', $result['missing_fields']);
        $this->assertContains('contact_number', $result['missing_fields']);
        $this->assertContains('logo', $result['missing_fields']);
        $this->assertContains('background_image', $result['missing_fields']);
        $this->assertContains('room_with_image', $result['missing_fields']);
    }

    public function test_is_ready_when_all_required_data_present(): void
    {
        Storage::fake('public');

        $tenant = $this->makeTenant();
        $resort = $this->makeResort($tenant, [
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
            'address_label' => null,
            'contact_number' => '0917-111-2222',
            'logo_url' => '/storage/logos/logo.png',
            'background_image_url' => '/storage/resort-backgrounds/bg.jpg',
        ]);
        app(PhilippineLocationService::class)->syncResortAddressLabel($resort);

        $room = Room::withoutGlobalScopes()->create([
            'resort_id' => $resort->id,
            'tenant_id' => $resort->tenant_id,
            'name' => 'Room A',
            'status' => 'active',
            'base_price' => 1000,
            'capacity' => 2,
        ]);

        Storage::disk('public')->put('rooms/photo.jpg', 'fake-image-data');

        RoomImage::create([
            'room_id' => $room->id,
            'tenant_id' => $resort->tenant_id,
            'path' => 'rooms/photo.jpg',
            'disk' => 'public',
            'original_name' => 'photo.jpg',
            'sort_order' => 1,
            'is_primary' => true,
        ]);

        $result = $this->service->check($resort);

        $this->assertTrue($result['is_ready']);
        $this->assertEmpty($result['missing_fields']);
    }

    public function test_fails_readiness_without_active_room_with_image(): void
    {
        $tenant = $this->makeTenant();
        $resort = $this->makeResort($tenant, [
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
            'address_label' => null,
            'contact_number' => '09171234567',
            'logo_url' => '/storage/logo.png',
            'background_image_url' => '/storage/bg.jpg',
        ]);
        app(PhilippineLocationService::class)->syncResortAddressLabel($resort);

        // No rooms at all
        $result = $this->service->check($resort);

        $this->assertFalse($result['is_ready']);
        $this->assertContains('room_with_image', $result['missing_fields']);
    }

    // ─── Payload composition ─────────────────────────────────────────────────

    public function test_computed_payload_contains_map_urls_for_valid_address(): void
    {
        $tenant = $this->makeTenant();
        $resort = $this->makeResort($tenant, [
            'name' => 'Palm Crest',
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
            'address_label' => null,
        ]);
        app(PhilippineLocationService::class)->syncResortAddressLabel($resort);

        $payload = $this->service->computePayload($resort, null);

        $this->assertNotNull($payload['map']['embedUrl']);
        $this->assertStringContainsString('maps.google.com', $payload['map']['embedUrl']);
        $this->assertNotNull($payload['map']['searchUrl']);
        $this->assertStringContainsString('maps/search', $payload['map']['searchUrl']);
        $this->assertEquals('Agtangao, Bangued, Abra', $payload['map']['address']);
    }

    public function test_computed_payload_has_null_map_when_location_is_empty(): void
    {
        $tenant = $this->makeTenant();
        $resort = $this->makeResort($tenant, [
            'address_province_psgc' => null,
            'address_city_municipality_psgc' => null,
            'address_barangay_psgc' => null,
            'address_label' => null,
        ]);

        $payload = $this->service->computePayload($resort, null);

        $this->assertNull($payload['map']['embedUrl']);
        $this->assertNull($payload['map']['searchUrl']);
    }

    public function test_computed_payload_footer_includes_owner_and_representative_info(): void
    {
        $tenant = $this->makeTenant();
        $resort = $this->makeResort($tenant, [
            'representative_name' => 'Rep Name',
            'representative_contact_number' => '09171112222',
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
            'name' => 'Owner Name',
            'phone' => '09179998888',
            'email' => 'owner@test.com',
        ]);

        $payload = $this->service->computePayload($resort, $owner);

        $this->assertEquals('Owner Name', $payload['footer']['ownerName']);
        $this->assertEquals('09179998888', $payload['footer']['ownerContact']);
        $this->assertEquals('Rep Name', $payload['footer']['representativeName']);
        $this->assertEquals('09171112222', $payload['footer']['representativeContact']);
        $this->assertEquals('owner@test.com', $payload['footer']['contactEmail']);
    }

    // ─── Public landing API ──────────────────────────────────────────────────

    public function test_public_landing_returns_503_when_landing_incomplete(): void
    {
        $tenant = $this->makeTenant(['subdomain' => 'incomplete-resort', 'slug' => 'incomplete-resort']);
        $resort = $this->makeResort($tenant, [
            'background_image_url' => null,
            'logo_url' => null,
            'address_province_psgc' => null,
            'address_city_municipality_psgc' => null,
            'address_barangay_psgc' => null,
            'address_label' => null,
        ]);
        $this->makeSubscription($resort, 'active');

        $response = $this->getJson('/api/v1/public/resorts/landing/incomplete-resort');

        $response->assertStatus(503);
        $response->assertJsonPath('errors.code', 'landing_incomplete');
    }

    public function test_public_landing_returns_503_when_subscription_pending_and_profile_incomplete(): void
    {
        // The public landing endpoint gates on readiness (profile completeness), not
        // subscription status. A pending_payment subscription with an incomplete
        // profile still returns 503 landing_incomplete.
        $tenant = $this->makeTenant(['subdomain' => 'no-sub-resort', 'slug' => 'no-sub-resort']);
        $resort = $this->makeResort($tenant, [
            'logo_url' => null,
            'background_image_url' => null,
        ]);
        $this->makeSubscription($resort, 'pending_payment');

        $response = $this->getJson('/api/v1/public/resorts/landing/no-sub-resort');

        $response->assertStatus(503);
        $response->assertJsonPath('errors.code', 'landing_incomplete');
    }
}
