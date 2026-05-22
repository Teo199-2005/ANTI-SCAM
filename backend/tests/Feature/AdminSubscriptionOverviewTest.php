<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\User;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSubscriptionOverviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PsgcReferenceSeeder::class);
    }

    public function test_admin_subscription_overview_returns_resorts_without_undefined_loc_error(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        Resort::withoutGlobalScopes()->create([
            'tenant_id' => null,
            'name' => 'Overview Test Resort',
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'is_publicly_listed' => false,
        ]);

        $response = $this->getJson('/api/v1/admin/subscriptions/overview');

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $this->assertIsArray($response->json('data'));
    }
}
