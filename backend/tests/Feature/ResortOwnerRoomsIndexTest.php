<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\User;
use Database\Seeders\DemoLoginAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResortOwnerRoomsIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_resort_owner_can_list_rooms_via_index_route(): void
    {
        $this->seed(DemoLoginAccountsSeeder::class);

        $owner = User::where('email', 'owner@resort.test')->firstOrFail();
        $this->assertSame('resort_owner', $owner->role);

        $resort = Resort::withoutGlobalScopes()->where('tenant_id', $owner->tenant_id)->firstOrFail();

        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/rooms?perPage=50&resort_id='.$resort->id);

        $response->assertOk()->assertJsonPath('success', true);
    }
}
