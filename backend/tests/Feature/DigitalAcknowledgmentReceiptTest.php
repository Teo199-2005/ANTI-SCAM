<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Services\DigitalAcknowledgmentReceiptService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DigitalAcknowledgmentReceiptTest extends TestCase
{
    use RefreshDatabase;

    public function test_allocate_bkg_increments_per_year(): void
    {
        $svc = app(DigitalAcknowledgmentReceiptService::class);
        $d = Carbon::parse('2026-06-15 12:00:00');

        $a = $svc->allocate(DigitalAcknowledgmentReceiptService::KIND_BOOKING, $d);
        $b = $svc->allocate(DigitalAcknowledgmentReceiptService::KIND_BOOKING, $d);

        $this->assertSame('ASPH-BKG-2026-000001', $a);
        $this->assertSame('ASPH-BKG-2026-000002', $b);
    }

    public function test_allocate_sub_is_independent_sequence(): void
    {
        $svc = app(DigitalAcknowledgmentReceiptService::class);
        $d = Carbon::parse('2026-03-01');

        $sub = $svc->allocate(DigitalAcknowledgmentReceiptService::KIND_SUBSCRIPTION, $d);
        $bkg = $svc->allocate(DigitalAcknowledgmentReceiptService::KIND_BOOKING, $d);

        $this->assertSame('ASPH-SUB-2026-000001', $sub);
        $this->assertSame('ASPH-BKG-2026-000001', $bkg);
    }

    public function test_subscription_invoice_webhook_sets_acknowledgment_receipt(): void
    {
        config(['services.xendit.webhook_token' => 'sub-hook-token']);

        $tenant = Tenant::create([
            'name' => 'Sub Receipt Tenant',
            'slug' => 'sub-rec-tenant',
            'subdomain' => 'subrec',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Sub Receipt Resort',
            'is_publicly_listed' => true,
        ]);

        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2100,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 1,
            'total_monthly_fee' => 2100,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->toDateString(),
        ]);

        SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_sub_receipt_1',
            'xendit_invoice_url' => 'https://example.test/pay',
            'amount' => 2100,
            'plan' => 'basic_m1',
            'status' => 'pending',
            'billing_cycle_start' => $subscription->billing_cycle_start,
            'billing_cycle_end' => $subscription->billing_cycle_end,
        ]);

        $payload = ['id' => 'inv_sub_receipt_1', 'status' => 'PAID', 'event' => 'invoice.paid'];
        $headers = ['x-callback-token' => 'sub-hook-token'];

        $this->postJson('/api/v1/webhooks/xendit/subscription-invoice', $payload, $headers)->assertOk();

        $invoice = SubscriptionInvoice::query()->where('xendit_invoice_id', 'inv_sub_receipt_1')->first();
        $this->assertNotNull($invoice);
        $this->assertMatchesRegularExpression('/^ASPH-SUB-\d{4}-\d{6}$/', (string) $invoice->acknowledgment_receipt_no);
        $this->assertSame('paid', $invoice->status);
    }
}
