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

class AdminMarketersMonitoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_marketers_monitoring(): void
    {
        $marketer = User::factory()->create(['role' => 'marketing']);
        Sanctum::actingAs($marketer);

        $this->getJson('/api/v1/admin/marketers/monitoring')->assertForbidden();
    }

    public function test_admin_marketers_monitoring_returns_rows_and_commissions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $tenant = Tenant::create([
            'name' => 'Mon Tenant',
            'slug' => 'mon-tenant',
            'subdomain' => 'mon',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Mon Resort',
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
            'referral_code' => 'TESTCODE99',
        ]);

        SubscriptionInvoice::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => null,
            'xendit_invoice_url' => null,
            'amount' => 2100,
            'plan' => 'basic_m1',
            'referral_code' => 'TESTCODE99',
            'marketer_id' => $marketer->id,
            'status' => 'paid',
            'billing_cycle_start' => now()->toDateString(),
            'billing_cycle_end' => now()->addMonth()->toDateString(),
            'paid_at' => now()->subMonths(2),
        ]);

        Commission::query()->create([
            'marketer_id' => $marketer->id,
            'resort_id' => $resort->id,
            'period' => '2026-04',
            'gross_bookings' => 250,
            'commission_rate' => 0,
            'marketer_tier' => 'booking_flat',
            'unit_commission_php' => 250,
            'commission_amount' => 250,
            'status' => 'pending',
        ]);

        $res = $this->getJson('/api/v1/admin/marketers/monitoring');
        $res->assertSuccessful()
            ->assertJsonPath('data.rows.0.id', $marketer->id)
            ->assertJsonPath('data.rows.0.referred_clients_count', 1)
            ->assertJsonPath('data.rows.0.referred_resorts_count', 1)
            ->assertJsonPath('data.rows.0.commission_pending_php', fn ($v) => (float) $v === 250.0)
            ->assertJsonPath('data.rows.0.current_commission_per_booking_php', fn ($v) => (float) $v === 10.0)
            ->assertJsonPath('data.rows.0.uses_custom_booking_commission', false)
            ->assertJsonPath('data.meta.new_client_definition', fn ($v) => is_string($v) && $v !== '')
            ->assertJsonPath('data.meta.booking_commission_policy', fn ($v) => is_string($v) && $v !== '')
            ->assertJsonPath('data.meta.commission_per_booking_php', 10);
    }
}
