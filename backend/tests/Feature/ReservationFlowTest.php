<?php

namespace Tests\Feature;

use App\Models\BookingLock;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReservationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_reservation_is_created_from_valid_lock_token(): void
    {
        $tenant = Tenant::create([
            'name' => 'Demo Tenant',
            'slug' => 'demo-tenant',
            'subdomain' => 'demo',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Demo Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Suite 1',
            'code' => 'S1',
            'status' => 'active',
            'base_price' => 1500,
            'capacity' => 2,
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'user',
        ]);
        Sanctum::actingAs($user);

        $lockResponse = $this->postJson('/api/v1/booking-locks', [
            'room_id' => $room->id,
            'check_in_date' => now()->addDays(1)->toDateString(),
            'check_out_date' => now()->addDays(2)->toDateString(),
        ]);

        $lockResponse->assertCreated();
        $lockToken = $lockResponse->json('data.lock_token');

        $reservationResponse = $this->postJson('/api/v1/reservations', [
            'resort_id' => $resort->id,
            'lock_token' => $lockToken,
            'guest_count' => 2,
            'total_amount' => 3000,
        ]);

        $reservationResponse->assertCreated();
        $this->assertDatabaseHas('booking_locks', ['lock_token' => $lockToken, 'status' => 'converted']);
        $this->assertDatabaseHas('reservations', ['room_id' => $room->id, 'status' => 'pending_payment']);
    }

    public function test_client_can_cancel_own_reservation(): void
    {
        $tenant = Tenant::create([
            'name' => 'Cancel Tenant',
            'slug' => 'cancel-tenant',
            'subdomain' => 'cancel',
            'status' => 'active',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'user',
        ]);
        Sanctum::actingAs($user);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Cancel Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Cancel Room',
            'code' => 'CR1',
            'status' => 'active',
            'base_price' => 1000,
            'capacity' => 2,
        ]);

        $reservation = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => $user->id,
            'reference_no' => 'RSV-CANCEL-1',
            'check_in_date' => now()->addDays(3)->toDateString(),
            'check_out_date' => now()->addDays(4)->toDateString(),
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 1000,
            'status' => 'pending_payment',
            'xendit_payment_status' => 'pending',
            'reserved_at' => now(),
        ]);

        $response = $this->postJson("/api/v1/reservations/{$reservation->id}/cancel");
        $response->assertOk();

        $this->assertDatabaseHas('reservations', ['id' => $reservation->id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('audit_logs', [
            'entity_type' => 'reservation',
            'entity_id' => $reservation->id,
            'action' => 'reservation_cancelled_by_client',
        ]);
    }
}
