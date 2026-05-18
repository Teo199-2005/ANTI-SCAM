<?php

namespace Tests\Feature;

use App\Models\EmailLog;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Billing\Services\SubscriptionPaymentConfirmationService;
use App\Support\SubscriptionPlan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionPaymentConfirmationEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_business_pro_payment_sends_activation_email_immediately(): void
    {
        config(['mail.default' => 'array', 'queue.default' => 'database']);

        $tenant = Tenant::create([
            'name' => 'Sub Mail Tenant',
            'slug' => 'sub-mail',
            'subdomain' => 'submail',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Sub Mail Resort',
            'is_publicly_listed' => true,
        ]);

        $subscription = Subscription::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => SubscriptionPlan::STANDARD,
            'base_price' => 0,
            'included_rooms' => 10,
            'extra_room_fee' => 0,
            'active_room_count' => 1,
            'total_monthly_fee' => 0,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
            'email' => 'owner@resort.test',
            'name' => 'Resort Owner',
        ]);

        $cycleStart = now()->startOfMonth()->toDateString();
        $cycleEnd = now()->endOfMonth()->toDateString();

        $invoice = SubscriptionInvoice::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_sub_activation',
            'amount' => 1000,
            'plan' => SubscriptionPlan::BUSINESS_PRO.'_m1',
            'status' => 'paid',
            'paid_at' => now(),
            'billing_cycle_start' => $cycleStart,
            'billing_cycle_end' => $cycleEnd,
            'acknowledgment_receipt_no' => 'DAR-SUB-0001',
        ]);

        app(SubscriptionPaymentConfirmationService::class)->applyBaseSubscriptionPayment($invoice);

        $this->assertDatabaseHas('email_logs', [
            'type' => 'subscription_business_pro_activated',
            'to_email' => 'owner@resort.test',
            'status' => 'sent',
        ]);

        $this->assertDatabaseMissing('email_logs', [
            'type' => 'subscription_renewal_confirmation',
            'to_email' => 'owner@resort.test',
            'status' => 'sent',
        ]);
    }

    public function test_second_business_pro_payment_sends_renewal_confirmation(): void
    {
        config(['mail.default' => 'array', 'queue.default' => 'database']);

        $tenant = Tenant::create([
            'name' => 'Renew Tenant',
            'slug' => 'renew-tenant',
            'subdomain' => 'renewtest',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Renew Resort',
            'is_publicly_listed' => true,
        ]);

        $subscription = Subscription::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => SubscriptionPlan::BUSINESS_PRO,
            'base_price' => 1000,
            'included_rooms' => 20,
            'extra_room_fee' => 0,
            'active_room_count' => 1,
            'total_monthly_fee' => 1000,
            'status' => 'active',
            'billing_cycle_start' => now()->subMonth()->toDateString(),
            'billing_cycle_end' => now()->subDay()->toDateString(),
            'next_due_date' => now()->subDay()->toDateString(),
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
            'email' => 'renew@resort.test',
        ]);

        $priorStart = now()->subMonths(2)->startOfMonth()->toDateString();
        $priorEnd = now()->subMonths(2)->endOfMonth()->toDateString();

        SubscriptionInvoice::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_sub_prior',
            'amount' => 1000,
            'plan' => SubscriptionPlan::BUSINESS_PRO.'_m1',
            'status' => 'paid',
            'paid_at' => now()->subMonth(),
            'billing_cycle_start' => $priorStart,
            'billing_cycle_end' => $priorEnd,
        ]);

        $renewal = SubscriptionInvoice::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_sub_renewal',
            'amount' => 1000,
            'plan' => SubscriptionPlan::BUSINESS_PRO.'_m1_rec',
            'status' => 'paid',
            'paid_at' => now(),
            'billing_cycle_start' => now()->subMonth()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->subMonth()->endOfMonth()->toDateString(),
        ]);

        app(SubscriptionPaymentConfirmationService::class)->applyBaseSubscriptionPayment($renewal);

        $this->assertDatabaseHas('email_logs', [
            'type' => 'subscription_renewal_confirmation',
            'to_email' => 'renew@resort.test',
            'status' => 'sent',
        ]);
    }

    public function test_resend_command_is_idempotent(): void
    {
        config(['mail.default' => 'array']);

        $tenant = Tenant::create([
            'name' => 'Cmd Tenant',
            'slug' => 'cmd-tenant',
            'subdomain' => 'cmdtest',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Cmd Resort',
            'is_publicly_listed' => true,
        ]);

        $subscription = Subscription::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => SubscriptionPlan::BUSINESS_PRO,
            'base_price' => 1000,
            'included_rooms' => 20,
            'extra_room_fee' => 0,
            'active_room_count' => 1,
            'total_monthly_fee' => 1000,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
            'email' => 'cmd@resort.test',
        ]);

        $invoice = SubscriptionInvoice::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_cmd',
            'amount' => 1000,
            'plan' => SubscriptionPlan::BUSINESS_PRO.'_m1',
            'status' => 'paid',
            'paid_at' => now(),
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
        ]);

        $this->artisan('subscriptions:send-missing-confirmation-emails', ['--limit' => 10])
            ->assertSuccessful();

        $count = EmailLog::query()
            ->where('type', 'subscription_business_pro_activated')
            ->where('to_email', 'cmd@resort.test')
            ->where('status', 'sent')
            ->count();

        $this->assertSame(1, $count);

        $this->artisan('subscriptions:send-missing-confirmation-emails', ['--limit' => 10])
            ->assertSuccessful();

        $this->assertSame(1, EmailLog::query()
            ->where('type', 'subscription_business_pro_activated')
            ->where('to_email', 'cmd@resort.test')
            ->where('status', 'sent')
            ->count());
    }
}
