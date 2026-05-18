<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionPlanGatingTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithPlan(string $plan): User
    {
        $tenant = Tenant::create([
            'name' => 'Gate Tenant',
            'slug' => 'gate-tenant',
            'subdomain' => 'gate',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Gate Resort',
            'is_publicly_listed' => true,
        ]);

        Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => $plan,
            'base_price' => $plan === 'business_pro' ? 1000 : 0,
            'included_rooms' => $plan === 'business_pro' ? 20 : 10,
            'extra_room_fee' => 0,
            'active_room_count' => 0,
            'total_monthly_fee' => $plan === 'business_pro' ? 1000 : 0,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);

        Sanctum::actingAs($user);

        return $user;
    }

    public function test_standard_owner_cannot_access_revenue_analytics(): void
    {
        $this->ownerWithPlan('standard');

        $this->getJson('/api/v1/dashboard/resort-revenue-analytics')
            ->assertStatus(403);
    }

    public function test_business_pro_owner_can_access_revenue_analytics(): void
    {
        $this->ownerWithPlan('business_pro');

        $this->getJson('/api/v1/dashboard/resort-revenue-analytics')
            ->assertOk();
    }

    public function test_standard_owner_pay_invoice_persists_billing_cycle_when_subscription_end_is_null(): void
    {
        config(['services.xendit.secret_key' => 'xnd_development_test_key']);

        $tenant = Tenant::create([
            'name' => 'Std Checkout Tenant',
            'slug' => 'std-checkout',
            'subdomain' => 'stdcheckout',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Std Checkout Resort',
            'is_publicly_listed' => true,
        ]);

        Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'standard',
            'base_price' => 0,
            'included_rooms' => 10,
            'extra_room_fee' => 0,
            'active_room_count' => 2,
            'total_monthly_fee' => 0,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfDay()->toDateString(),
            'billing_cycle_end' => null,
            'next_due_date' => null,
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);

        Http::fake([
            'https://api.xendit.co/v2/invoices' => Http::response([
                'id' => 'inv_std_upgrade',
                'invoice_url' => 'https://checkout.xendit.co/std-upgrade',
            ], 200),
        ]);

        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/resort-owner/subscriptions/pay-invoice', [
            'billing_scope' => 'monthly',
        ])
            ->assertOk()
            ->assertJsonPath('data.invoice_url', 'https://checkout.xendit.co/std-upgrade');

        $this->assertDatabaseHas('subscription_invoices', [
            'resort_id' => $resort->id,
            'status' => 'pending',
            'xendit_invoice_id' => 'inv_std_upgrade',
        ]);

        $invoice = \App\Models\SubscriptionInvoice::query()->where('resort_id', $resort->id)->first();
        $this->assertNotNull($invoice->billing_cycle_start);
        $this->assertNotNull($invoice->billing_cycle_end);
        $this->assertSame(now()->startOfDay()->toDateString(), $invoice->billing_cycle_start->toDateString());
        $this->assertSame(
            now()->startOfDay()->addMonth()->subDay()->toDateString(),
            $invoice->billing_cycle_end->toDateString()
        );
    }
}
