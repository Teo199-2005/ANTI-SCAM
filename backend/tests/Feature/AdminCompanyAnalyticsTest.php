<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCompanyAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_fetch_company_analytics_with_executives(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/company?year='.now()->year);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.executive_amount_php_per_booking', 20)
            ->assertJsonPath('data.executive_team_total_php', 0)
            ->assertJsonCount(3, 'data.executives')
            ->assertJsonPath('data.executives.0.role_short', 'COO')
            ->assertJsonPath('data.executives.1.role_short', 'CTO')
            ->assertJsonPath('data.executives.2.role_short', 'CMO');
    }

    public function test_non_admin_cannot_fetch_company_analytics(): void
    {
        $owner = User::factory()->create(['role' => 'resort_owner']);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/v1/admin/analytics/company')
            ->assertForbidden();
    }
}
