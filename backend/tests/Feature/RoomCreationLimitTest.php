<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoomCreationLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_cannot_create_room_when_at_subscription_limit(): void
    {
        $tenant = Tenant::create([
            'name' => 'Limit Tenant',
            'slug' => 'limit-tenant',
            'subdomain' => 'limit',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Limit Resort',
            'is_publicly_listed' => true,
        ]);

        // create subscription with included_rooms = 1
        Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'standard',
            'base_price' => 0,
            'included_rooms' => 1,
            'extra_room_fee' => 0,
            'active_room_count' => 1,
            'total_monthly_fee' => 2000,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);

        // create one active room already
        Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Existing Room',
            'code' => 'ER1',
            'status' => 'active',
            'base_price' => 1000,
            'capacity' => 2,
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);
        Sanctum::actingAs($user);

        $payload = [
            'resort_id' => $resort->id,
            'name' => 'New Room',
            'code' => 'NR1',
            'status' => 'active',
            'base_price' => 1200,
            'capacity' => 2,
        ];

        $response = $this->postJson('/api/v1/rooms', $payload);
        $response->assertStatus(422);
        $this->assertDatabaseMissing('rooms', ['code' => 'NR1']);
    }
}
