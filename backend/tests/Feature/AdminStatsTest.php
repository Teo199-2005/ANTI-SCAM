<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_admin_stats(): void
    {
        $owner = User::factory()->create(['role' => 'resort_owner']);
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/admin/stats')->assertForbidden();
    }

    public function test_admin_stats_returns_payload_shape(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/stats')
            ->assertSuccessful()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'totalResorts',
                    'publicResorts',
                    'suspendedResorts',
                    'gracePeriodResorts',
                    'totalUsers',
                    'newUsersThisWeek',
                    'totalReservations',
                    'confirmedReservations',
                    'pendingPayment',
                    'totalRevenue',
                    'revenueThisMonth',
                    'recentReservations',
                ],
            ]);
    }
}
