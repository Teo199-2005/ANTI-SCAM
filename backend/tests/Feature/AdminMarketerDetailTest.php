<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminMarketerDetailTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_fetch_marketer_detail_with_clients_and_transactions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $marketer = User::factory()->create([
            'role' => 'marketing',
            'referral_code' => 'CHARLIE01',
        ]);

        $tenant = Tenant::create([
            'name' => 'Charlie Resort OPC',
            'slug' => 'charlie-opc',
            'subdomain' => 'charlie',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Charlie Beach',
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
            'next_due_date' => now()->addMonth()->startOfMonth()->toDateString(),
            'grace_until' => null,
            'status' => 'active',
        ]);

        SubscriptionInvoice::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'inv_charlie_1',
            'xendit_invoice_url' => null,
            'amount' => 3800,
            'plan' => 'basic_m1',
            'referral_code' => 'CHARLIE01',
            'marketer_id' => $marketer->id,
            'status' => 'paid',
            'billing_cycle_start' => now()->toDateString(),
            'billing_cycle_end' => now()->addMonth()->toDateString(),
            'paid_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/v1/admin/marketers/{$marketer->id}/detail");

        $response->assertOk()
            ->assertJsonPath('data.marketer.id', $marketer->id)
            ->assertJsonPath('data.marketer.referral_code', 'CHARLIE01')
            ->assertJsonPath('data.clients_meta.paid_converting', 1)
            ->assertJsonCount(1, 'data.clients')
            ->assertJsonCount(1, 'data.transactions')
            ->assertJsonPath('data.transactions.0.resort_name', 'Charlie Beach')
            ->assertJsonPath('data.transactions.0.amount_php', 3800);
    }

    public function test_non_marketer_returns_404(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create(['role' => 'resort_owner']);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/admin/marketers/{$owner->id}/detail")
            ->assertStatus(404);
    }
}
