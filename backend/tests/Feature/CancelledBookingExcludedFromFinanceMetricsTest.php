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

class CancelledBookingExcludedFromFinanceMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_finance_overview_excludes_cancelled_paid_bookings(): void
    {
        $tenant = Tenant::create([
            'name' => 'Cx Tenant',
            'slug' => 'cx-tenant',
            'subdomain' => 'cxfin',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Cx Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Cx Room',
            'code' => 'CX1',
            'status' => 'active',
            'base_price' => 2000,
            'capacity' => 2,
        ]);

        $client = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'client',
        ]);

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => $client->id,
            'reference_no' => 'RSV-OK-1',
            'check_in_date' => now()->addDays(5)->toDateString(),
            'check_out_date' => now()->addDays(6)->toDateString(),
            'guest_count' => 2,
            'reservation_fee' => 100,
            'total_amount' => 2000,
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
            'reserved_at' => now(),
        ]);

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => $client->id,
            'reference_no' => 'RSV-CXL-1',
            'check_in_date' => now()->addDays(8)->toDateString(),
            'check_out_date' => now()->addDays(9)->toDateString(),
            'guest_count' => 2,
            'reservation_fee' => 500,
            'total_amount' => 3000,
            'status' => 'cancelled',
            'xendit_payment_status' => 'paid',
            'reserved_at' => now(),
            'cancelled_at' => now(),
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/finance/overview')
            ->assertOk()
            ->assertJsonPath('data.guest_booking_paid_total', fn ($v) => (float) $v === 100.0)
            ->assertJsonPath('data.counts.reservations_paid', 1);
    }
}
