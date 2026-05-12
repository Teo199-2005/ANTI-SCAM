<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomImage;
use App\Models\Subscription;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PhilippineLocationService;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicReservationFeeAndResortLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_room_payload_includes_reservation_fee_from_system_setting(): void
    {
        $this->seed(PsgcReferenceSeeder::class);

        SystemSetting::query()->updateOrCreate(
            ['key' => 'reservation_fee'],
            ['value' => '650', 'type' => 'integer', 'description' => 'Test fee']
        );

        $tenant = Tenant::create([
            'name' => 'Fee Tenant',
            'slug' => 'fee-tenant',
            'subdomain' => 'fee',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Fee Resort',
            'is_publicly_listed' => true,
            'logo_url' => '/storage/x.png',
            'background_image_url' => '/storage/y.png',
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
            'address_label' => null,
            'contact_number' => '09170000001',
        ]);
        app(PhilippineLocationService::class)->syncResortAddressLabel($resort);

        Subscription::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
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

        Storage::fake('public');
        Storage::disk('public')->put('rooms/r.jpg', 'fake');

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Deluxe',
            'code' => 'D1',
            'status' => 'active',
            'base_price' => 3000,
            'capacity' => 2,
        ]);

        RoomImage::create([
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'path' => 'rooms/r.jpg',
            'disk' => 'public',
            'original_name' => 'r.jpg',
            'sort_order' => 1,
            'is_primary' => true,
        ]);

        $response = $this->getJson("/api/v1/public/rooms/{$room->id}");

        $response->assertOk();
        $this->assertSame(650.0, (float) $response->json('data.reservationFee'));
    }

    public function test_resort_owner_can_mark_confirmed_reservation_completed(): void
    {
        $tenant = Tenant::create([
            'name' => 'Lc Tenant',
            'slug' => 'lc-tenant',
            'subdomain' => 'lc',
            'status' => 'active',
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Lc Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'R1',
            'code' => 'R1',
            'status' => 'active',
            'base_price' => 1000,
            'capacity' => 2,
        ]);

        $reservation = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => null,
            'reference_no' => 'RSV-LC-001',
            'check_in_date' => now()->subDay()->toDateString(),
            'check_out_date' => now()->addDay()->toDateString(),
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 2000,
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
            'reserved_at' => now(),
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/v1/reservations/{$reservation->id}/complete");

        $response->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->assertSame('completed', $reservation->fresh()->status);
    }
}
