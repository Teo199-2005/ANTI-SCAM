<?php

namespace Tests\Feature;

use App\Models\Commission;
use App\Models\MarketerBookingCommissionEvent;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Services\BookingReferralCommissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketingBookingCommissionSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_commission_amount_via_system_settings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this
            ->putJson('/api/v1/admin/settings', [
                'settings' => [
                    ['key' => 'marketing_booking_commission_php', 'value' => '25'],
                ],
            ])
            ->assertSuccessful();

        $this->assertSame('25.00', SystemSetting::where('key', 'marketing_booking_commission_php')->value('value'));
    }

    public function test_rejects_invalid_commission_amount(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this
            ->putJson('/api/v1/admin/settings', [
                'settings' => [
                    ['key' => 'marketing_booking_commission_php', 'value' => '0'],
                ],
            ])
            ->assertStatus(422);
    }

    public function test_rate_change_only_affects_new_credits_not_existing_events(): void
    {
        $this->artisan('migrate', ['--force' => true]);

        SystemSetting::query()->updateOrCreate(
            ['key' => 'marketing_booking_commission_php'],
            ['value' => '10.00', 'type' => 'decimal', 'description' => 'test'],
        );

        $ctx = $this->seedReferredResort();
        $service = app(BookingReferralCommissionService::class);

        $r1 = $this->paidReservation($ctx, 'RSV-RATE-1');
        $service->creditFromPaidReservation($r1);

        SystemSetting::setValue('marketing_booking_commission_php', '50.00');

        $r2 = $this->paidReservation($ctx, 'RSV-RATE-2');
        $service->creditFromPaidReservation($r2);

        $this->assertSame(10.0, (float) MarketerBookingCommissionEvent::query()
            ->where('reservation_id', $r1->id)->value('amount'));
        $this->assertSame(50.0, (float) MarketerBookingCommissionEvent::query()
            ->where('reservation_id', $r2->id)->value('amount'));

        $commission = Commission::query()->first();
        $this->assertNotNull($commission);
        $this->assertSame(60.0, (float) $commission->commission_amount);
    }

    /** @return array{tenant: Tenant, resort: Resort, room: Room, marketer: User} */
    private function seedReferredResort(): array
    {
        $tenant = Tenant::create([
            'name' => 'Settings Tenant',
            'slug' => 'set-tenant',
            'subdomain' => 'settenant',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Settings Resort',
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

        $marketer = User::factory()->create(['role' => 'marketing']);

        DB::table('marketer_resorts')->insert([
            'marketer_id' => $marketer->id,
            'resort_id' => $resort->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return compact('tenant', 'resort', 'room', 'marketer');
    }

    /** @param array{tenant: Tenant, resort: Resort, room: Room, marketer: User} $ctx */
    private function paidReservation(array $ctx, string $ref): Reservation
    {
        return Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $ctx['tenant']->id,
            'resort_id' => $ctx['resort']->id,
            'room_id' => $ctx['room']->id,
            'client_id' => User::factory()->create(['tenant_id' => $ctx['tenant']->id, 'role' => 'client'])->id,
            'reference_no' => $ref,
            'booking_source' => 'online',
            'check_in_date' => now()->addDays(5)->toDateString(),
            'check_out_date' => now()->addDays(6)->toDateString(),
            'guest_count' => 2,
            'reservation_fee' => 500,
            'total_amount' => 3000,
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
            'xendit_invoice_id' => 'inv_'.$ref,
            'reserved_at' => now(),
        ]);
    }
}
