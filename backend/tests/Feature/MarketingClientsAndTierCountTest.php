<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\MarketerTierService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketingClientsAndTierCountTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_tenant_two_resorts_counts_as_one_client_for_tier(): void
    {
        $tenant = Tenant::create([
            'name' => 'Dual Resort OPC',
            'slug' => 'dual-opc',
            'subdomain' => 'dual',
            'status' => 'active',
        ]);

        $marketer = User::factory()->create([
            'role' => 'marketing',
            'referral_code' => 'DUALREF01',
        ]);

        $r1 = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Resort Alpha',
            'is_publicly_listed' => true,
        ]);
        $r2 = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Resort Beta',
            'is_publicly_listed' => true,
        ]);

        foreach ([$r1, $r2] as $resort) {
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

            SubscriptionInvoice::query()->create([
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'resort_id' => $resort->id,
                'xendit_invoice_id' => 'inv_dual_'.$resort->id,
                'xendit_invoice_url' => null,
                'amount' => 2000,
                'plan' => 'basic_m1',
                'referral_code' => 'DUALREF01',
                'marketer_id' => $marketer->id,
                'status' => 'paid',
                'billing_cycle_start' => now()->toDateString(),
                'billing_cycle_end' => now()->addMonth()->toDateString(),
                'paid_at' => now(),
            ]);
        }

        $tiers = app(MarketerTierService::class);
        $this->assertSame(1, $tiers->countConvertingClients($marketer->id));
        $this->assertSame(2, $tiers->countDistinctReferredResorts($marketer->id));

        Sanctum::actingAs($marketer);
        $this->getJson('/api/v1/dashboard/marketing/clients')
            ->assertSuccessful()
            ->assertJsonPath('data.clients.0.tenant_id', $tenant->id)
            ->assertJsonPath('data.clients.0.referred_resorts_count', 2)
            ->assertJsonPath('data.clients.0.qualifying_subscription_invoices', 2)
            ->assertJsonPath('data.meta.total', 1);
    }
}
