<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class XenditUnifiedInvoiceWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_unified_invoices_webhook_handles_subscription_expired(): void
    {
        config(['services.xendit.webhook_token' => 'test-webhook-token']);

        $tenant = Tenant::create([
            'name' => 'Unified Tenant',
            'slug' => 'unified-tenant',
            'subdomain' => 'unified',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Unified Resort',
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
            'xendit_invoice_id' => 'inv_unified_sub_1',
            'xendit_invoice_url' => 'https://checkout.xendit.co/test',
            'amount' => 2000,
            'plan' => 'basic_m1_b0',
            'status' => 'pending',
            'billing_cycle_start' => $subscription->billing_cycle_start,
            'billing_cycle_end' => $subscription->billing_cycle_end,
        ]);

        $this->postJson('/api/v1/webhooks/xendit/invoices', [
            'id' => 'inv_unified_sub_1',
            'status' => 'EXPIRED',
            'event' => 'invoice.status',
        ], ['x-callback-token' => 'test-webhook-token'])
            ->assertOk()
            ->assertJsonPath('data.subscription_invoice_id', 1);

        $this->assertDatabaseHas('subscription_invoices', [
            'xendit_invoice_id' => 'inv_unified_sub_1',
            'status' => 'expired',
        ]);
    }
}
