<?php

namespace Tests\Feature;

use App\Models\Commission;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LegacySubscriptionCommissionCleanupTest extends TestCase
{
    use RefreshDatabase;

    public function test_marketer_detail_voids_pending_legacy_subscription_commission_and_exposes_trigger(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $marketer = User::factory()->create(['role' => 'marketing', 'referral_code' => 'CHARLIE01']);

        $tenant = Tenant::create([
            'name' => 'Tierras OPC',
            'slug' => 'tierras-opc',
            'subdomain' => 'tierras',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Tierras Altas De Tarlac',
            'is_publicly_listed' => true,
        ]);

        $subscription = Subscription::query()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 3800,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 2,
            'total_monthly_fee' => 3800,
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->addMonth()->toDateString(),
            'status' => 'active',
        ]);

        $paidAt = now()->subDays(6);
        SubscriptionInvoice::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_legacy_charlie',
            'amount' => 3800,
            'plan' => 'basic_m3_fmf',
            'referral_code' => 'CHARLIE01',
            'marketer_id' => $marketer->id,
            'status' => 'paid',
            'paid_at' => $paidAt,
            'billing_cycle_start' => $paidAt->copy()->startOfMonth(),
            'billing_cycle_end' => $paidAt->copy()->addMonths(3)->endOfMonth(),
        ]);

        Commission::query()->create([
            'marketer_id' => $marketer->id,
            'resort_id' => $resort->id,
            'period' => $paidAt->format('Y-m'),
            'gross_bookings' => 3800,
            'commission_amount' => 150,
            'commission_rate' => 0,
            'marketer_tier' => 'silver',
            'unit_commission_php' => 150,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/v1/admin/marketers/{$marketer->id}/detail");

        $response->assertOk()
            ->assertJsonPath('data.marketer.commission_pending_php', 0)
            ->assertJsonPath('data.legacy_subscription_commissions_meta.voided_pending_rows', 1)
            ->assertJsonPath('data.legacy_subscription_commissions.0.amount_php', 150)
            ->assertJsonPath('data.legacy_subscription_commissions.0.marketer_tier', 'silver')
            ->assertJsonPath('data.legacy_subscription_commissions.0.trigger.amount_php', 3800);

        $this->assertSame(0, Commission::query()->where('marketer_id', $marketer->id)->where('status', 'pending')->count());
    }
}
