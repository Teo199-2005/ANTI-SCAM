<?php

namespace Tests\Feature;

use App\Models\Commission;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Billing\Services\SubscriptionPaymentConfirmationService;
use App\Services\SubscriptionReferralCommissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Legacy subscription commission service is deprecated; platform uses booking commissions.
 */
class SubscriptionReferralCommissionTierTest extends TestCase
{
    use RefreshDatabase;

    public function test_subscription_payment_confirmation_does_not_create_commission(): void
    {
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

        $marketer = User::factory()->create([
            'role' => 'marketing',
            'referral_code' => 'TIERCODE1',
        ]);

        $invoice = SubscriptionInvoice::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_tier_1',
            'amount' => 1000,
            'plan' => 'business_pro_m1',
            'referral_code' => 'TIERCODE1',
            'marketer_id' => $marketer->id,
            'status' => 'paid',
            'billing_cycle_start' => now()->startOfMonth(),
            'billing_cycle_end' => now()->endOfMonth(),
            'paid_at' => now(),
        ]);

        app(SubscriptionPaymentConfirmationService::class)->applyBaseSubscriptionPayment($invoice->refresh());

        $this->assertSame(0, Commission::query()->where('marketer_id', $marketer->id)->count());
    }

    public function test_legacy_subscription_commission_service_still_runs_when_called_directly(): void
    {
        config(['marketing_tiers.emergency_flat_per_payment_php' => null]);

        $tenant = Tenant::create([
            'name' => 'Legacy',
            'slug' => 'legacy',
            'subdomain' => 'legacy',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'R',
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
            'next_due_date' => now()->addMonth()->toDateString(),
            'status' => 'active',
        ]);

        $marketer = User::factory()->create(['role' => 'marketing', 'referral_code' => 'LEG']);

        $invoice = SubscriptionInvoice::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_legacy',
            'amount' => 2000,
            'plan' => 'basic_m1',
            'marketer_id' => $marketer->id,
            'status' => 'paid',
            'paid_at' => now(),
            'billing_cycle_start' => now()->startOfMonth(),
            'billing_cycle_end' => now()->endOfMonth(),
        ]);

        app(SubscriptionReferralCommissionService::class)->creditFromPaidMonthlyInvoice($invoice->refresh());

        $this->assertDatabaseHas('commissions', [
            'marketer_id' => $marketer->id,
            'commission_amount' => 150,
        ]);
    }
}
