<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ManualReservationResortOwnerTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{tenant: Tenant, resort: Resort, owner: User, room: Room} */
    private function seedResortWithRoom(): array
    {
        $this->seed(PsgcReferenceSeeder::class);

        $tenant = Tenant::create([
            'name' => 'Manual Tenant',
            'slug' => 'manual-tenant',
            'subdomain' => 'manualtenant',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Manual Resort',
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
            'active_room_count' => 1,
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

        $room = Room::withoutGlobalScopes()->create([
            'resort_id' => $resort->id,
            'tenant_id' => $tenant->id,
            'name' => 'Garden Suite',
            'status' => 'active',
            'base_price' => 2500,
            'capacity' => 4,
            'units' => 1,
        ]);

        return ['tenant' => $tenant, 'resort' => $resort, 'owner' => $owner, 'room' => $room];
    }

    public function test_resort_owner_can_create_update_and_cancel_manual_reservation(): void
    {
        ['resort' => $resort, 'owner' => $owner, 'room' => $room] = $this->seedResortWithRoom();

        Sanctum::actingAs($owner);

        $checkIn = now()->addDays(30)->toDateString();
        $checkOut = now()->addDays(32)->toDateString();

        $create = $this->postJson('/api/v1/reservations/manual', [
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'guest_name' => 'Jane Walkin',
            'guest_email' => 'jane@example.com',
            'guest_phone' => '09171234567',
            'guest_count' => 2,
            'total_amount' => 5000,
        ]);

        $create->assertCreated();
        $id = (int) $create->json('data.id');
        $this->assertNotSame(0, $id);

        $this->assertDatabaseHas('reservations', [
            'id' => $id,
            'booking_source' => 'manual',
            'status' => 'confirmed',
            'guest_name' => 'Jane Walkin',
        ]);

        $newOut = now()->addDays(33)->toDateString();
        $patch = $this->patchJson("/api/v1/reservations/{$id}/manual", [
            'check_out_date' => $newOut,
            'total_amount' => 5200,
        ]);
        $patch->assertOk();

        $this->assertSame($newOut, Reservation::query()->find($id)?->check_out_date?->toDateString());

        $cancel = $this->postJson("/api/v1/reservations/{$id}/cancel-by-resort", [
            'reason' => 'Guest changed plans',
        ]);
        $cancel->assertOk();

        $this->assertDatabaseHas('reservations', [
            'id' => $id,
            'status' => 'cancelled',
        ]);
    }

    public function test_client_cannot_create_manual_reservation(): void
    {
        ['tenant' => $tenant, 'resort' => $resort, 'room' => $room] = $this->seedResortWithRoom();

        $client = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'client',
        ]);

        Sanctum::actingAs($client);

        $this->postJson('/api/v1/reservations/manual', [
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'check_in_date' => now()->addDays(40)->toDateString(),
            'check_out_date' => now()->addDays(42)->toDateString(),
            'guest_name' => 'X',
            'guest_count' => 1,
            'total_amount' => 100,
        ])->assertForbidden();
    }
}
