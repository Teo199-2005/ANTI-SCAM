<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomAvailabilityCalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_availability_calendar_marks_confirmed_stay_nights_busy(): void
    {
        $tenant = Tenant::create([
            'name' => 'Cal Tenant',
            'slug' => 'cal-tenant',
            'subdomain' => 'cal',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Cal Resort',
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
            'reference_no' => 'RSV-JUN18',
            'check_in_date' => '2026-06-18',
            'check_out_date' => '2026-06-19',
            'guest_count' => 2,
            'reservation_fee' => 500,
            'total_amount' => 3000,
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
            'reserved_at' => now(),
        ]);

        $response = $this->getJson(
            "/api/v1/public/rooms/{$room->id}/availability-calendar?year=2026&month=6",
        );

        $response->assertOk();
        $days = $response->json('data.days');
        $this->assertIsArray($days);
        $this->assertSame('busy', $days['2026-06-18'] ?? null);
        $this->assertSame('busy', $days['2026-06-19'] ?? null);
    }

    public function test_availability_endpoint_rejects_overlapping_confirmed_stay(): void
    {
        $tenant = Tenant::create([
            'name' => 'Range Tenant',
            'slug' => 'range-tenant',
            'subdomain' => 'range',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Range Resort',
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
            'code' => 'DLX2',
            'status' => 'active',
            'base_price' => 3000,
            'capacity' => 2,
            'units' => 1,
        ]);

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'reference_no' => 'RSV-JUN18B',
            'check_in_date' => '2026-06-18',
            'check_out_date' => '2026-06-19',
            'guest_count' => 2,
            'reservation_fee' => 500,
            'total_amount' => 3000,
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
            'reserved_at' => now(),
        ]);

        $response = $this->getJson(
            "/api/v1/public/rooms/{$room->id}/availability?check_in_date=2026-06-18&check_out_date=2026-06-19",
        );

        $response->assertOk()
            ->assertJsonPath('data.available', false);
    }
}
