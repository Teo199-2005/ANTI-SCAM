<?php

namespace Tests\Feature;

use App\Models\Commission;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SubscriptionReferralCommissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionReferralCommissionTierTest extends TestCase
{
    use RefreshDatabase;

    public function test_credits_silver_commission_after_paid_invoice(): void
    {
        config(['marketing_tiers.emergency_flat_per_payment_php' => null]);

        $tenant = Tenant::create([
            'name' => 'Tier Tenant',
            'slug' => 'tier-tenant',
            'subdomain' => 'tier',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Tier Resort',
            'is_publicly_listed' => true,
        ]);

        $subscription = Subscription::query()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2000,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 2,
            'total_monthly_fee' => 2600,
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->addMonth()->startOfMonth()->toDateString(),
            'grace_until' => null,
            'status' => 'active',
        ]);

        $marketer = User::factory()->create([
            'role' => 'marketing',
            'referral_code' => 'TIERCODE1',
        ]);

        $invoice = SubscriptionInvoice::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_tier_1',
            'xendit_invoice_url' => null,
            'amount' => 2000,
            'plan' => 'basic_m1',
            'referral_code' => 'TIERCODE1',
            'marketer_id' => $marketer->id,
            'status' => 'paid',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'paid_at' => now(),
        ]);

        $invoice->refresh();

        app(SubscriptionReferralCommissionService::class)->creditFromPaidMonthlyInvoice($invoice);

        $period = $invoice->billing_cycle_start->format('Y-m');

        $this->assertDatabaseHas('commissions', [
            'marketer_id' => $marketer->id,
            'resort_id' => $resort->id,
            'period' => $period,
            'commission_amount' => 150,
            'marketer_tier' => 'silver',
            'unit_commission_php' => 150,
            'status' => 'pending',
        ]);
    }

    public function test_skips_credit_when_no_converting_resorts_resolved(): void
    {
        config(['marketing_tiers.emergency_flat_per_payment_php' => null]);

        $marketer = User::factory()->create(['role' => 'marketing']);

        // Invoice marked paid but not persisted in a way count sees it — use unpaid to simulate
        // edge: marketer_id set, plan ok, but status not paid so count stays 0
        $tenant = Tenant::create([
            'name' => 'T2',
            'slug' => 't2',
            'subdomain' => 't2',
            'status' => 'active',
        ]);
        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'R2',
            'is_publicly_listed' => true,
        ]);
        $subscription = Subscription::query()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2000,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 2,
            'total_monthly_fee' => 2600,
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->addMonth()->startOfMonth()->toDateString(),
            'grace_until' => null,
            'status' => 'active',
        ]);

        $invoice = new SubscriptionInvoice([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'amount' => 1000,
            'plan' => 'basic_m1',
            'marketer_id' => $marketer->id,
            'status' => 'pending',
            'billing_cycle_start' => now()->startOfMonth(),
            'billing_cycle_end' => now()->endOfMonth(),
        ]);
        $invoice->save();

        app(SubscriptionReferralCommissionService::class)->creditFromPaidMonthlyInvoice($invoice);

        $this->assertSame(0, Commission::query()->where('marketer_id', $marketer->id)->count());
    }
}
