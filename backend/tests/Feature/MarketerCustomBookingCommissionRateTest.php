<?php

namespace Tests\Feature;

use App\Models\MarketerBookingCommissionEvent;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Tenant;
use App\Models\User;
use App\Services\BookingReferralCommissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketerCustomBookingCommissionRateTest extends TestCase
{
    use RefreshDatabase;

    public function test_custom_rate_is_used_when_crediting_booking_commission(): void
    {
        $tenant = Tenant::create([
            'name' => 'Custom Rate Tenant',
            'slug' => 'custom-rate',
            'subdomain' => 'customrate',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Custom Rate Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Room A',
            'code' => 'A1',
            'status' => 'active',
            'base_price' => 3000,
            'capacity' => 4,
        ]);

        $marketer = User::factory()->create([
            'role' => 'marketing',
            'referral_code' => 'CUSTOM15',
            'booking_commission_php' => 15.50,
        ]);

        DB::table('marketer_resorts')->insert([
            'marketer_id' => $marketer->id,
            'resort_id' => $resort->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $reservation = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'reference_no' => 'RSV-CUSTOM15',
            'booking_source' => 'online',
            'check_in_date' => now()->addDays(5)->toDateString(),
            'check_out_date' => now()->addDays(6)->toDateString(),
            'guest_count' => 2,
            'reservation_fee' => 500,
            'total_amount' => 3000,
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
            'reserved_at' => now(),
        ]);

        app(BookingReferralCommissionService::class)->creditFromPaidReservation($reservation);

        $event = MarketerBookingCommissionEvent::query()->where('reservation_id', $reservation->id)->first();
        $this->assertNotNull($event);
        $this->assertSame(15.50, (float) $event->amount);
    }

    public function test_admin_can_set_and_clear_custom_booking_commission_on_marketer(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $marketer = User::factory()->create(['role' => 'marketing']);

        Sanctum::actingAs($admin);

        $this->putJson("/api/v1/users/{$marketer->id}", [
            'booking_commission_php' => 25,
        ])->assertSuccessful();

        $marketer->refresh();
        $this->assertSame('25.00', $marketer->booking_commission_php);

        $this->putJson("/api/v1/users/{$marketer->id}", [
            'booking_commission_php' => null,
        ])->assertSuccessful();

        $marketer->refresh();
        $this->assertNull($marketer->booking_commission_php);
    }

    public function test_monitoring_shows_custom_rate_for_marketer(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $marketer = User::factory()->create([
            'role' => 'marketing',
            'booking_commission_php' => 12.00,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/marketers/monitoring')
            ->assertSuccessful()
            ->assertJsonPath('data.rows.0.current_commission_per_booking_php', fn ($v) => (float) $v === 12.0)
            ->assertJsonPath('data.rows.0.uses_custom_booking_commission', true)
            ->assertJsonPath('data.rows.0.booking_commission_php', fn ($v) => (float) $v === 12.0);
    }
}
