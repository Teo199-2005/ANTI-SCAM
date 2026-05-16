<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResortDashboardStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_resort_stats_includes_recent_reservations_for_owner(): void
    {
        $tenant = Tenant::create([
            'name' => 'Dash Tenant',
            'slug' => 'dash-tenant',
            'subdomain' => 'dash',
            'status' => 'active',
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Dash Resort',
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

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'reference_no' => 'RSV-DASH-1',
            'check_in_date' => '2026-06-18',
            'check_out_date' => '2026-06-19',
            'guest_count' => 2,
            'reservation_fee' => 1,
            'total_amount' => 0.4,
            'status' => 'confirmed',
            'reserved_at' => now(),
        ]);

        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/dashboard/resort-stats');

        $response->assertOk()
            ->assertJsonPath('data.recentReservations.0.reference_no', 'RSV-DASH-1')
            ->assertJsonPath('data.recentReservations.0.check_in_date', '2026-06-18');
    }
}
