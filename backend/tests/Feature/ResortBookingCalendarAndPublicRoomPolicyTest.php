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

class ResortBookingCalendarAndPublicRoomPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_resort_owner_can_fetch_full_month_booking_calendar_for_tenant(): void
    {
        $tenant = Tenant::create([
            'name' => 'Calendar Tenant',
            'slug' => 'calendar-tenant',
            'subdomain' => 'calendar-tenant',
            'status' => 'active',
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Calendar Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Calendar Room',
            'code' => 'CAL-1',
            'status' => 'active',
            'base_price' => 2400,
            'capacity' => 2,
        ]);

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => null,
            'reference_no' => 'RSV-CALENDAR-1',
            'check_in_date' => now()->startOfMonth()->addDays(2)->toDateString(),
            'check_out_date' => now()->startOfMonth()->addDays(4)->toDateString(),
            'guest_count' => 2,
            'reservation_fee' => 500,
            'total_amount' => 4800,
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
            'reserved_at' => now(),
        ]);

        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/v1/dashboard/resort-booking-calendar?year=' . now()->year . '&month=' . now()->month);

        $response->assertOk();
        $response->assertJsonPath('data.year', now()->year);
        $response->assertJsonPath('data.month', now()->month);
        $response->assertJsonCount(1, 'data.reservations');
        $response->assertJsonPath('data.reservations.0.reference_no', 'RSV-CALENDAR-1');
    }

    public function test_public_room_endpoint_requires_public_listed_resort_and_active_subscription(): void
    {
        $tenant = Tenant::create([
            'name' => 'Room Policy Tenant',
            'slug' => 'room-policy-tenant',
            'subdomain' => 'room-policy-tenant',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Room Policy Resort',
            'is_publicly_listed' => false,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Policy Room',
            'code' => 'POL-1',
            'status' => 'active',
            'base_price' => 2200,
            'capacity' => 2,
        ]);

        $notListedResponse = $this->getJson('/api/v1/public/rooms/' . $room->id);
        $notListedResponse->assertStatus(404);

        $resort->update(['is_publicly_listed' => true]);
        Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2000,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 1,
            'total_monthly_fee' => 2000,
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
            'status' => 'expired',
        ]);

        $inactiveSubResponse = $this->getJson('/api/v1/public/rooms/' . $room->id);
        $inactiveSubResponse->assertStatus(403);
        $inactiveSubResponse->assertJsonPath('errors.room.0', 'subscription_inactive');
    }
}

