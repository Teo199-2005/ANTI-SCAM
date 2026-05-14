<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Room;
use App\Models\RoomImage;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PhilippineLocationService;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminLandingEmbedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PsgcReferenceSeeder::class);
    }

    public function test_non_admin_cannot_update_landing_embed(): void
    {
        $owner = User::factory()->create(['role' => 'resort_owner']);
        $tenant = Tenant::create([
            'name' => 'T',
            'slug' => 't',
            'subdomain' => 't',
            'status' => 'active',
        ]);
        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'R',
            'is_publicly_listed' => true,
        ]);

        Sanctum::actingAs($owner);

        $this->patchJson("/api/v1/admin/resorts/{$resort->id}/landing-embed", [
            'admin_landing_embed_enabled' => true,
            'admin_landing_youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ])->assertForbidden();
    }

    public function test_admin_update_landing_embed_persists_and_public_landing_exposes_video_id(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $tenant = Tenant::create([
            'name' => 'Embed Tenant',
            'slug' => 'embed-tenant',
            'subdomain' => 'embed-demo',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Embed Resort',
            'is_publicly_listed' => true,
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
            'contact_number' => '09171112222',
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

        Storage::disk('public')->put('rooms/embed-test.jpg', 'fake-image-data');
        RoomImage::create([
            'room_id' => $room->id,
            'tenant_id' => $resort->tenant_id,
            'path' => 'rooms/embed-test.jpg',
            'disk' => 'public',
            'original_name' => 'embed-test.jpg',
            'sort_order' => 1,
            'is_primary' => true,
        ]);

        Subscription::create([
            'tenant_id' => $resort->tenant_id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2000,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 1,
            'total_monthly_fee' => 2000,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);

        $this->patchJson("/api/v1/admin/resorts/{$resort->id}/landing-embed", [
            'admin_landing_embed_enabled' => true,
            'admin_landing_youtube_url' => 'https://youtu.be/dQw4w9WgXcQ',
        ])->assertOk()
            ->assertJsonPath('data.admin_landing_embed_enabled', true);

        $resort->refresh();
        $this->assertTrue($resort->admin_landing_embed_enabled);
        $this->assertStringContainsString('youtu.be', (string) $resort->admin_landing_youtube_url);

        $landing = $this->getJson('/api/v1/public/resorts/landing/embed-demo')->assertOk();
        $landing->assertJsonPath('data.adminLandingEmbed.enabled', true);
        $landing->assertJsonPath('data.adminLandingEmbed.youtubeVideoId', 'dQw4w9WgXcQ');
    }

    public function test_admin_enable_without_valid_youtube_returns_422(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $tenant = Tenant::create([
            'name' => 'T2',
            'slug' => 't2',
            'subdomain' => 't2',
            'status' => 'active',
        ]);
        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'R2',
            'is_publicly_listed' => true,
        ]);

        $this->patchJson("/api/v1/admin/resorts/{$resort->id}/landing-embed", [
            'admin_landing_embed_enabled' => true,
            'admin_landing_youtube_url' => 'not-a-youtube-link',
        ])->assertStatus(422);
    }
}
