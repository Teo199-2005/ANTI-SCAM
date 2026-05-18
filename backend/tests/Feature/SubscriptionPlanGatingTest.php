<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
