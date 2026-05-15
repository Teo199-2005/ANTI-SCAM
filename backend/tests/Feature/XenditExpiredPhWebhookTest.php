<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class XenditExpiredPhWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_expired_ph_webhook_marks_reservation_expired(): void
    {
        config(['services.xendit.webhook_token' => 'test-webhook-token']);

        $tenant = Tenant::create([
            'name' => 'Expired Tenant',
            'slug' => 'expired-tenant',
            'subdomain' => 'expired',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Expired Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Room',
            'code' => 'R1',
            'status' => 'active',
            'base_price' => 1500,
            'capacity' => 2,
        ]);

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'reference_no' => 'RSV-EXP-1',
            'check_in_date' => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(3)->toDateString(),
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 1500,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'inv_expired_ph_1',
            'xendit_payment_status' => 'pending',
            'reserved_at' => now(),
        ]);

        $payload = ['id' => 'inv_expired_ph_1', 'status' => 'EXPIRED', 'event' => 'invoice.expired'];
        $headers = ['x-callback-token' => 'test-webhook-token'];

        $this->postJson('/api/v1/webhooks/xendit/expired-ph', $payload, $headers)
            ->assertOk()
            ->assertJsonPath('data.ignored', false)
            ->assertJsonPath('data.reservation_id', 1);

        $this->assertDatabaseHas('reservations', [
            'xendit_invoice_id' => 'inv_expired_ph_1',
            'status' => 'expired',
            'xendit_payment_status' => 'expired',
        ]);
    }

    public function test_expired_ph_webhook_marks_subscription_invoice_expired(): void
    {
        config(['services.xendit.webhook_token' => 'test-webhook-token']);

        $tenant = Tenant::create([
            'name' => 'Sub Tenant',
            'slug' => 'sub-tenant',
            'subdomain' => 'sub',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Sub Resort',
            'is_publicly_listed' => true,
        ]);

        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2100,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 0,
            'total_monthly_fee' => 2100,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->addDays(5)->toDateString(),
        ]);

        SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_sub_expired_ph_1',
            'xendit_invoice_url' => 'https://checkout.xendit.co/test',
            'amount' => 2100,
            'plan' => 'basic_m1_b0',
            'status' => 'pending',
            'billing_cycle_start' => $subscription->billing_cycle_start,
            'billing_cycle_end' => $subscription->billing_cycle_end,
        ]);

        $payload = ['id' => 'inv_sub_expired_ph_1', 'status' => 'EXPIRED', 'event' => 'invoice.expired'];
        $headers = ['x-callback-token' => 'test-webhook-token'];

        $this->postJson('/api/v1/webhooks/xendit/expired-ph', $payload, $headers)
            ->assertOk()
            ->assertJsonPath('data.ignored', false)
            ->assertJsonPath('data.subscription_invoice_id', 1);

        $this->assertDatabaseHas('subscription_invoices', [
            'xendit_invoice_id' => 'inv_sub_expired_ph_1',
            'status' => 'expired',
        ]);
    }

    public function test_expired_ph_webhook_ignores_paid_status(): void
    {
        config(['services.xendit.webhook_token' => 'test-webhook-token']);

        $this->postJson('/api/v1/webhooks/xendit/expired-ph', [
            'id' => 'inv_wrong_channel',
            'status' => 'PAID',
            'event' => 'invoice.paid',
        ], ['x-callback-token' => 'test-webhook-token'])
            ->assertOk()
            ->assertJsonPath('data.ignored', true)
            ->assertJsonPath('data.reason', 'not_expired_or_failed');

        $this->assertDatabaseCount('xendit_webhook_events', 0);
    }
}
