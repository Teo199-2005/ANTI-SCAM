<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AbandonedCheckoutHoldTest extends TestCase
{
    use RefreshDatabase;

    private function seedRoom(): array
    {
        $tenant = Tenant::create([
            'name' => 'Hold Tenant',
            'slug' => 'hold-tenant',
            'subdomain' => 'hold',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Hold Resort',
            'is_publicly_listed' => true,
        ]);

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

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Deluxe',
            'code' => 'DLX',
            'status' => 'active',
            'base_price' => 3000,
            'capacity' => 2,
            'units' => 1,
        ]);

        return [$tenant, $room];
    }

    public function test_stale_pending_payment_does_not_block_availability_calendar(): void
    {
        [, $room] = $this->seedRoom();

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $room->tenant_id,
            'resort_id' => $room->resort_id,
            'room_id' => $room->id,
            'reference_no' => 'RSV-STALE',
            'check_in_date' => '2026-05-21',
            'check_out_date' => '2026-05-22',
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 3000,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'inv_stale_1',
            'xendit_payment_status' => 'pending',
            'reserved_at' => now()->subMinutes(20),
        ]);

        $response = $this->getJson(
            "/api/v1/public/rooms/{$room->id}/availability-calendar?year=2026&month=5",
        );

        $response->assertOk();
        $days = $response->json('data.days');
        $this->assertSame('free', $days['2026-05-21'] ?? null);
        $this->assertDatabaseHas('reservations', [
            'reference_no' => 'RSV-STALE',
            'status' => 'expired',
        ]);
    }

    public function test_guest_can_release_checkout_hold_immediately(): void
    {
        config(['services.xendit.secret_key' => 'xnd_development_test_key']);

        [, $room] = $this->seedRoom();

        $client = User::factory()->create([
            'tenant_id' => $room->tenant_id,
            'role' => 'client',
        ]);

        $reservation = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $room->tenant_id,
            'resort_id' => $room->resort_id,
            'room_id' => $room->id,
            'client_id' => $client->id,
            'reference_no' => 'RSV-RELEASE',
            'check_in_date' => '2026-05-21',
            'check_out_date' => '2026-05-22',
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 3000,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'inv_release_1',
            'xendit_payment_status' => 'pending',
            'reserved_at' => now(),
        ]);

        Http::fake([
            'https://api.xendit.co/v2/invoices/inv_release_1' => Http::response([
                'id' => 'inv_release_1',
                'status' => 'PENDING',
            ], 200),
        ]);

        Sanctum::actingAs($client);

        $this->postJson("/api/v1/reservations/{$reservation->id}/release-checkout-hold")
            ->assertOk()
            ->assertJsonPath('data.status', 'expired');

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'expired',
        ]);
    }
}
