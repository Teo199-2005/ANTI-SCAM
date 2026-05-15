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

/**
 * Xendit legacy callbacks use event "invoice.status" (not only invoice.paid).
 */
class XenditInvoiceStatusWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_unified_webhook_confirms_booking_on_invoice_status_paid(): void
    {
        config(['services.xendit.webhook_token' => 'test-webhook-token']);

        $tenant = Tenant::create([
            'name' => 'Status Tenant',
            'slug' => 'status-tenant',
            'subdomain' => 'status',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Status Resort',
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
            'reference_no' => 'RSV-STATUS-1',
            'check_in_date' => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(3)->toDateString(),
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 1500,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'inv_status_paid_1',
            'xendit_payment_status' => 'pending',
            'reserved_at' => now(),
        ]);

        $this->postJson('/api/v1/webhooks/xendit/invoices', [
            'id' => 'inv_status_paid_1',
            'status' => 'PAID',
            'event' => 'invoice.status',
            'payer_email' => 'guest@example.com',
        ], ['x-callback-token' => 'test-webhook-token'])
            ->assertOk();

        $this->assertDatabaseHas('reservations', [
            'xendit_invoice_id' => 'inv_status_paid_1',
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
        ]);
    }

    public function test_unified_webhook_marks_subscription_expired_on_invoice_status(): void
    {
        config(['services.xendit.webhook_token' => 'test-webhook-token']);

        $tenant = Tenant::create([
            'name' => 'Sub Status',
            'slug' => 'sub-status',
            'subdomain' => 'substatus',
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
            'billing_cycle_start' => '2026-05-01',
            'billing_cycle_end' => '2026-05-31',
            'next_due_date' => '2026-06-01',
        ]);

        SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => '69fde621171632a4f74a65a8',
            'xendit_invoice_url' => 'https://checkout.xendit.co/test',
            'amount' => 2000,
            'plan' => 'basic_m1_b0',
            'status' => 'pending',
            'billing_cycle_start' => $subscription->billing_cycle_start,
            'billing_cycle_end' => $subscription->billing_cycle_end,
        ]);

        $this->postJson('/api/v1/webhooks/xendit/invoices', [
            'id' => '69fde621171632a4f74a65a8',
            'status' => 'EXPIRED',
            'event' => 'invoice.status',
        ], ['x-callback-token' => 'test-webhook-token'])
            ->assertOk();

        $this->assertDatabaseHas('subscription_invoices', [
            'xendit_invoice_id' => '69fde621171632a4f74a65a8',
            'status' => 'expired',
        ]);
    }

    public function test_webhook_health_returns_ok_without_token(): void
    {
        $this->getJson('/api/v1/webhooks/xendit/health')
            ->assertOk()
            ->assertJsonPath('data.ok', true);
    }
}
