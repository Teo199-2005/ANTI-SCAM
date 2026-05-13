<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReservationPolicyTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private Resort $resort;
    private Room $room;
    private Reservation $reservation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'name' => 'Tenant A',
            'slug' => 'tenant-a',
            'subdomain' => 'tenant-a',
            'status' => 'active',
        ]);

        $this->tenantB = Tenant::create([
            'name' => 'Tenant B',
            'slug' => 'tenant-b',
            'subdomain' => 'tenant-b',
            'status' => 'active',
        ]);

        $this->resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Resort A',
            'is_publicly_listed' => true,
        ]);

        $this->room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'resort_id' => $this->resort->id,
            'name' => 'Suite A',
            'code' => 'SA1',
            'status' => 'active',
            'base_price' => 2000,
            'capacity' => 2,
        ]);

        $client = User::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'role' => 'user',
        ]);

        $this->reservation = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'room_id' => $this->room->id,
            'resort_id' => $this->resort->id,
            'client_id' => $client->id,
            'check_in_date' => now()->addDays(5)->toDateString(),
            'check_out_date' => now()->addDays(7)->toDateString(),
            'total_amount' => 4000,
            'reservation_fee' => 500,
            'status' => 'confirmed',
            'reference_no' => 'REF-TEST-001',
        ]);
    }

    public function test_admin_can_view_any_reservation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/reservations/' . $this->reservation->id);

        $response->assertStatus(200);
    }

    public function test_resort_owner_same_tenant_can_view_reservation(): void
    {
        $owner = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $this->tenantA->id,
        ]);
        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/reservations/' . $this->reservation->id);

        $response->assertStatus(200);
    }

    public function test_resort_owner_different_tenant_cannot_view_reservation(): void
    {
        $otherOwner = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $this->tenantB->id,
        ]);
        Sanctum::actingAs($otherOwner);

        $response = $this->getJson('/api/v1/reservations/' . $this->reservation->id);

        $response->assertStatus(403);
    }

    public function test_admin_staff_same_tenant_can_view_reservation(): void
    {
        $staff = User::factory()->create([
            'role' => 'admin_staff',
            'tenant_id' => $this->tenantA->id,
        ]);
        Sanctum::actingAs($staff);

        $response = $this->getJson('/api/v1/reservations/' . $this->reservation->id);

        $response->assertStatus(200);
    }

    public function test_client_can_view_own_reservation(): void
    {
        $client = User::where('id', $this->reservation->client_id)->first();
        Sanctum::actingAs($client);

        $response = $this->getJson('/api/v1/reservations/' . $this->reservation->id);

        $response->assertStatus(200);
    }

    public function test_client_cannot_view_another_clients_reservation(): void
    {
        $otherClient = User::factory()->create([
            'role' => 'user',
            'tenant_id' => $this->tenantA->id,
        ]);
        Sanctum::actingAs($otherClient);

        $response = $this->getJson('/api/v1/reservations/' . $this->reservation->id);

        $response->assertStatus(403);
    }

    public function test_guest_can_view_own_reservation_when_client_id_matches(): void
    {
        $guest = User::factory()->create([
            'role' => 'guest',
            'tenant_id' => null,
            'home_resort_id' => $this->resort->id,
        ]);

        $this->reservation->forceFill(['client_id' => $guest->id])->save();

        Sanctum::actingAs($guest);

        $response = $this->getJson('/api/v1/reservations/' . $this->reservation->id);

        $response->assertStatus(200);
    }

    public function test_guest_cannot_view_another_clients_reservation(): void
    {
        $guest = User::factory()->create([
            'role' => 'guest',
            'tenant_id' => null,
            'home_resort_id' => $this->resort->id,
        ]);
        Sanctum::actingAs($guest);

        $response = $this->getJson('/api/v1/reservations/' . $this->reservation->id);

        $response->assertStatus(403);
    }

    public function test_non_admin_cannot_admin_override_reservation(): void
    {
        $owner = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $this->tenantA->id,
        ]);
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/reservations/' . $this->reservation->id . '/admin-override', [
            'status' => 'cancelled',
            'reason' => 'Test override',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_admin_override_reservation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/reservations/' . $this->reservation->id . '/admin-override', [
            'status' => 'cancelled',
            'reason' => 'Admin test override',
        ]);

        $response->assertStatus(200);
    }
}
