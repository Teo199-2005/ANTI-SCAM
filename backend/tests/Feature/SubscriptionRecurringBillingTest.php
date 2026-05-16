<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Billing\Services\XenditRecurringWebhookService;
use App\Modules\Billing\Support\SubscriptionBillingMode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionRecurringBillingTest extends TestCase
{
    use RefreshDatabase;

    private function seedDueSubscription(string $billingMode = 'manual'): array
    {
        $tenant = Tenant::create([
            'name' => 'Recurring Tenant',
            'slug' => 'rec-tenant',
            'subdomain' => 'rectest',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Recurring Resort',
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
            'billing_mode' => $billingMode,
            'renewal_duration_months' => 3,
            'billing_cycle_start' => now()->subMonths(3)->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->subDay()->toDateString(),
            'next_due_date' => now()->subDay()->toDateString(),
            'recurring_activated_at' => $billingMode === SubscriptionBillingMode::AUTO_CARD ? now() : null,
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);

        return [$resort, $subscription, $owner];
    }

    public function test_owner_checkout_requires_payment_method(): void
    {
        config(['services.xendit.secret_key' => 'xnd_development_test_key']);

        [$resort, , $owner] = $this->seedDueSubscription();
        $resort->subscription->update(['status' => 'expired']);

        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/resort-owner/subscriptions/pay-invoice', [
            'billing_scope' => 'monthly',
            'subscription_duration_months' => 1,
        ])->assertStatus(422);
    }

    public function test_card_checkout_tags_invoice_plan_with_rec_suffix(): void
    {
        config([
            'services.xendit.secret_key' => 'xnd_development_test_key',
            'xendit_recurring.enabled' => true,
        ]);

        [$resort, , $owner] = $this->seedDueSubscription();
        $resort->subscription->update(['status' => 'expired']);

        Http::fake([
            'https://api.xendit.co/v2/invoices' => Http::response([
                'id' => 'inv_rec_tag',
                'invoice_url' => 'https://checkout.xendit.co/rec',
            ], 200),
        ]);

        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/resort-owner/subscriptions/pay-invoice', [
            'billing_scope' => 'monthly',
            'subscription_duration_months' => 3,
            'payment_method' => 'CREDIT_CARD',
        ])->assertOk();

        $this->assertDatabaseHas('subscription_invoices', [
            'resort_id' => $resort->id,
            'plan' => 'basic_m3_b0_rec',
            'status' => 'pending',
        ]);
    }

    public function test_generate_invoices_skips_auto_card_subscriptions(): void
    {
        config(['services.xendit.secret_key' => 'xnd_development_test_key']);

        [, $subscription] = $this->seedDueSubscription(SubscriptionBillingMode::AUTO_CARD);
        $subscription->update([
            'xendit_recurring_plan_id' => 'repl_test_plan',
            'recurring_cancelled_at' => null,
        ]);

        Artisan::call('subscriptions:generate-invoices');

        $this->assertDatabaseMissing('subscription_invoices', [
            'subscription_id' => $subscription->id,
            'source' => 'cron_manual',
        ]);
    }

    public function test_generate_invoices_creates_manual_renewal_invoice(): void
    {
        config(['services.xendit.secret_key' => 'xnd_development_test_key']);

        [, $subscription] = $this->seedDueSubscription(SubscriptionBillingMode::MANUAL);

        Http::fake([
            'https://api.xendit.co/v2/invoices' => Http::response([
                'id' => 'inv_cron_manual',
                'invoice_url' => 'https://checkout.xendit.co/cron',
            ], 200),
        ]);

        Artisan::call('subscriptions:generate-invoices');

        $this->assertDatabaseHas('subscription_invoices', [
            'subscription_id' => $subscription->id,
            'source' => 'cron_manual',
            'status' => 'pending',
        ]);
    }

    public function test_cancel_recurring_switches_billing_mode_to_manual(): void
    {
        config([
            'services.xendit.secret_key' => 'xnd_development_test_key',
            'xendit_recurring.enabled' => true,
        ]);

        [$resort, $subscription, $owner] = $this->seedDueSubscription(SubscriptionBillingMode::AUTO_CARD);
        $subscription->update([
            'xendit_recurring_plan_id' => 'repl_cancel_test',
            'recurring_cancelled_at' => null,
        ]);

        Http::fake([
            'https://api.xendit.co/recurring/plans/*' => Http::response(['id' => 'repl_cancel_test'], 200),
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/resorts/{$resort->id}/subscriptions/cancel-recurring")
            ->assertOk()
            ->assertJsonPath('data.billing_mode', SubscriptionBillingMode::MANUAL);

        $subscription->refresh();
        $this->assertSame(SubscriptionBillingMode::MANUAL, $subscription->billing_mode);
        $this->assertNotNull($subscription->recurring_cancelled_at);
    }

    public function test_recurring_cycle_webhook_extends_subscription_once(): void
    {
        config(['services.xendit.webhook_token' => 'test-token']);

        [, $subscription] = $this->seedDueSubscription(SubscriptionBillingMode::AUTO_CARD);
        $subscription->update([
            'xendit_recurring_plan_id' => 'repl_cycle_plan',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);

        $payload = [
            'id' => 'cycle_evt_1',
            'event' => 'recurring.cycle.succeeded',
            'status' => 'SUCCEEDED',
            'plan_id' => 'repl_cycle_plan',
            'cycle_id' => 'rcy_unique_1',
        ];

        $service = app(XenditRecurringWebhookService::class);
        $service->handle($payload);
        $service->handle($payload);

        $subscription->refresh();
        $paidCount = SubscriptionInvoice::query()
            ->where('subscription_id', $subscription->id)
            ->where('xendit_recurring_cycle_id', 'rcy_unique_1')
            ->where('status', 'paid')
            ->count();

        $this->assertSame(1, $paidCount);
        $this->assertTrue($subscription->billing_cycle_end->greaterThan(now()->endOfMonth()));
    }
}
