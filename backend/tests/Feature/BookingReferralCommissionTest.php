<?php

namespace Tests\Feature;

use App\Models\Commission;
use App\Models\MarketerBookingCommissionEvent;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Billing\Services\SubscriptionPaymentConfirmationService;
use App\Modules\Reservations\Services\ReservationService;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Services\BookingReferralCommissionService;
use App\Services\MarketerCommissionPayoutService;
use App\Services\SubscriptionReferralCommissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BookingReferralCommissionTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{tenant: Tenant, resort: Resort, room: Room, marketer: User} */
    private function seedReferredResort(): array
    {
        $tenant = Tenant::create([
            'name' => 'Booking Comm Tenant',
            'slug' => 'bk-comm',
            'subdomain' => 'bkcomm',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Referred Resort',
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
            'referral_code' => 'BOOKREF01',
        ]);

        DB::table('marketer_resorts')->insert([
            'marketer_id' => $marketer->id,
            'resort_id' => $resort->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return compact('tenant', 'resort', 'room', 'marketer');
    }

    private function paidOnlineReservation(array $ctx, array $overrides = []): Reservation
    {
        return Reservation::withoutGlobalScopes()->create(array_merge([
            'tenant_id' => $ctx['tenant']->id,
            'resort_id' => $ctx['resort']->id,
            'room_id' => $ctx['room']->id,
            'booking_source' => 'online',
            'reference_no' => 'RSV-'.uniqid(),
            'check_in_date' => now()->addDays(5)->toDateString(),
            'check_out_date' => now()->addDays(6)->toDateString(),
            'guest_count' => 2,
            'reservation_fee' => 500,
            'total_amount' => 3000,
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
            'reserved_at' => now(),
        ], $overrides));
    }

    public function test_credits_ten_peso_per_qualifying_booking(): void
    {
        $ctx = $this->seedReferredResort();
        $reservation = $this->paidOnlineReservation($ctx);

        app(BookingReferralCommissionService::class)->creditFromPaidReservation($reservation);

        $period = app(BookingReferralCommissionService::class)->periodForReservation($reservation);

        $this->assertDatabaseHas('commissions', [
            'marketer_id' => $ctx['marketer']->id,
            'resort_id' => $ctx['resort']->id,
            'period' => $period,
            'commission_amount' => 10,
            'booking_count' => 1,
            'gross_bookings' => 10,
            'marketer_tier' => 'booking_flat',
            'unit_commission_php' => 10,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('marketer_booking_commission_events', [
            'reservation_id' => $reservation->id,
            'type' => MarketerBookingCommissionEvent::TYPE_CREDIT,
            'amount' => 10,
        ]);
    }

    public function test_credit_is_idempotent(): void
    {
        $ctx = $this->seedReferredResort();
        $reservation = $this->paidOnlineReservation($ctx);
        $service = app(BookingReferralCommissionService::class);

        $service->creditFromPaidReservation($reservation);
        $service->creditFromPaidReservation($reservation);

        $this->assertSame(1, MarketerBookingCommissionEvent::query()->where('type', 'credit')->count());
        $this->assertSame(10.0, (float) Commission::query()->sum('commission_amount'));
    }

    public function test_skips_manual_and_unpaid_bookings(): void
    {
        $ctx = $this->seedReferredResort();
        $service = app(BookingReferralCommissionService::class);

        $manual = $this->paidOnlineReservation($ctx, [
            'booking_source' => 'manual',
            'reference_no' => 'RSV-MAN-1',
        ]);
        $pending = $this->paidOnlineReservation($ctx, [
            'status' => 'pending_payment',
            'xendit_payment_status' => 'pending',
            'reference_no' => 'RSV-PEND-1',
        ]);

        $service->creditFromPaidReservation($manual);
        $service->creditFromPaidReservation($pending);

        $this->assertSame(0, Commission::query()->count());
    }

    public function test_cancel_reverses_pending_commission(): void
    {
        $ctx = $this->seedReferredResort();
        $client = User::factory()->create(['tenant_id' => $ctx['tenant']->id, 'role' => 'client']);
        $reservation = $this->paidOnlineReservation($ctx, ['client_id' => $client->id]);

        app(BookingReferralCommissionService::class)->creditFromPaidReservation($reservation);

        app(ReservationService::class)->cancelByClient($reservation, $client->id, 'Change of plans');

        $this->assertDatabaseHas('marketer_booking_commission_events', [
            'reservation_id' => $reservation->id,
            'type' => MarketerBookingCommissionEvent::TYPE_REVERSAL,
        ]);

        $this->assertSame(0.0, (float) Commission::query()->sum('commission_amount'));
        $this->assertSame(0, (int) Commission::query()->value('booking_count'));
    }

    public function test_subscription_payment_does_not_create_commission(): void
    {
        config(['marketing_tiers.emergency_flat_per_payment_php' => null]);

        $ctx = $this->seedReferredResort();

        $subscription = Subscription::query()->create([
            'tenant_id' => $ctx['tenant']->id,
            'resort_id' => $ctx['resort']->id,
            'plan' => 'business_pro',
            'base_price' => 1000,
            'included_rooms' => 10,
            'extra_room_fee' => 0,
            'active_room_count' => 2,
            'total_monthly_fee' => 1000,
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->addMonth()->toDateString(),
            'status' => 'active',
        ]);

        $invoice = SubscriptionInvoice::query()->create([
            'tenant_id' => $ctx['tenant']->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $ctx['resort']->id,
            'xendit_invoice_id' => 'sub_inv_1',
            'amount' => 1000,
            'plan' => 'business_pro_m1',
            'marketer_id' => $ctx['marketer']->id,
            'status' => 'paid',
            'paid_at' => now(),
            'billing_cycle_start' => now()->startOfMonth(),
            'billing_cycle_end' => now()->endOfMonth(),
        ]);

        app(SubscriptionPaymentConfirmationService::class)->applyBaseSubscriptionPayment($invoice);

        $this->assertSame(0, Commission::query()->count());
    }

    public function test_payout_net_allocation_matches_booking_gross(): void
    {
        config(['services.marketing_payout.withholding_rate' => 0.10]);

        $ctx = $this->seedReferredResort();
        $service = app(BookingReferralCommissionService::class);

        for ($i = 0; $i < 5; $i++) {
            $reservation = $this->paidOnlineReservation($ctx, [
                'reference_no' => 'RSV-PAYOUT-'.$i,
            ]);
            $service->creditFromPaidReservation($reservation);
        }

        $commission = Commission::query()->first();
        $this->assertNotNull($commission);
        $this->assertSame(50.0, (float) $commission->commission_amount);

        $payouts = app(MarketerCommissionPayoutService::class);
        $allocated = $payouts->allocateNetByCommission(
            Commission::query()->where('status', 'pending')->get()
        );

        $this->assertSame(50.0, $allocated['gross_total']);
        $this->assertSame(45.0, $allocated['net_total']);
    }
}
