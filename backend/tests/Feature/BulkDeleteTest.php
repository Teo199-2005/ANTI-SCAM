<?php

namespace Tests\Feature;

use App\Models\DiscountCode;
use App\Models\GuestFavoriteRoom;
use App\Models\Resort;
use App\Models\Room;
use App\Models\RoomAvailability;
use App\Models\Tenant;
use App\Models\User;
use App\Services\BulkDeleteService;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BulkDeleteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PsgcReferenceSeeder::class);
    }

    public function test_non_admin_cannot_bulk_delete_users(): void
    {
        $owner = User::factory()->create(['role' => 'resort_owner']);
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/users/bulk-delete', ['ids' => [1]])
            ->assertForbidden();
    }

    public function test_admin_bulk_delete_users_blocks_self_and_reports_partial_failures(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $victim = User::factory()->create(['role' => 'client']);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/users/bulk-delete', [
            'ids' => [$admin->id, $victim->id, 999_999],
        ])->assertSuccessful();

        $response->assertJsonPath('data.deleted', 1);
        $response->assertJsonPath('success', true);
        $this->assertCount(2, $response->json('data.failed'));
        $this->assertDatabaseMissing('users', ['id' => $victim->id]);
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_bulk_delete_rejects_more_than_max_batch_size(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $ids = range(1, BulkDeleteService::MAX_BATCH + 1);

        $this->postJson('/api/v1/users/bulk-delete', ['ids' => $ids])
            ->assertUnprocessable();
    }

    public function test_resort_owner_can_bulk_delete_own_rooms_only(): void
    {
        $tenantA = Tenant::create([
            'name' => 'Tenant A',
            'slug' => 'tenant-a',
            'subdomain' => 'tenant-a',
            'status' => 'active',
        ]);
        $tenantB = Tenant::create([
            'name' => 'Tenant B',
            'slug' => 'tenant-b',
            'subdomain' => 'tenant-b',
            'status' => 'active',
        ]);

        $owner = User::factory()->create(['role' => 'resort_owner', 'tenant_id' => $tenantA->id]);
        $ownRoom = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenantA->id,
            'resort_id' => Resort::withoutGlobalScopes()->create([
                'tenant_id' => $tenantA->id,
                'name' => 'A Resort',
                'is_publicly_listed' => true,
            ])->id,
            'name' => 'Own',
            'status' => 'active',
            'base_price' => 1000,
            'capacity' => 2,
        ]);
        $otherRoom = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'resort_id' => Resort::withoutGlobalScopes()->create([
                'tenant_id' => $tenantB->id,
                'name' => 'B Resort',
                'is_publicly_listed' => true,
            ])->id,
            'name' => 'Other',
            'status' => 'active',
            'base_price' => 1000,
            'capacity' => 2,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/rooms/bulk-delete', [
            'ids' => [$ownRoom->id, $otherRoom->id],
        ])->assertSuccessful();

        $response->assertJsonPath('data.deleted', 1);
        $this->assertDatabaseMissing('rooms', ['id' => $ownRoom->id]);
        $this->assertDatabaseHas('rooms', ['id' => $otherRoom->id]);
    }

    public function test_guest_can_bulk_remove_favorites(): void
    {
        $tenant = Tenant::create([
            'name' => 'Guest Resort',
            'slug' => 'guest-resort',
            'subdomain' => 'guest-resort',
            'status' => 'active',
        ]);
        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Home',
            'is_publicly_listed' => true,
        ]);
        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Fav Room',
            'status' => 'active',
            'base_price' => 500,
            'capacity' => 2,
        ]);
        $guest = User::factory()->create([
            'role' => 'guest',
            'home_resort_id' => $resort->id,
        ]);
        GuestFavoriteRoom::query()->create([
            'user_id' => $guest->id,
            'room_id' => $room->id,
        ]);

        Sanctum::actingAs($guest);

        $this->postJson('/api/v1/guest/favorites/bulk-delete', [
            'room_ids' => [$room->id],
        ])
            ->assertSuccessful()
            ->assertJsonPath('data.deleted', 1);

        $this->assertDatabaseMissing('guest_favorite_rooms', [
            'user_id' => $guest->id,
            'room_id' => $room->id,
        ]);
    }

    public function test_resort_owner_can_bulk_delete_discount_codes_and_availability(): void
    {
        $tenant = Tenant::create([
            'name' => 'Disc Tenant',
            'slug' => 'disc-tenant',
            'subdomain' => 'disc-tenant',
            'status' => 'active',
        ]);
        $owner = User::factory()->create(['role' => 'resort_owner', 'tenant_id' => $tenant->id]);
        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Disc Resort',
            'is_publicly_listed' => true,
        ]);
        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'R1',
            'status' => 'active',
            'base_price' => 1000,
            'capacity' => 2,
        ]);
        $code = DiscountCode::query()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'code' => 'SAVE10',
            'type' => 'percent',
            'value' => 10,
            'is_active' => true,
        ]);
        $block = RoomAvailability::query()->create([
            'tenant_id' => $tenant->id,
            'room_id' => $room->id,
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-05',
            'status' => 'blocked',
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/resorts/{$resort->id}/discount-codes/bulk-delete", ['ids' => [$code->id]])
            ->assertSuccessful()
            ->assertJsonPath('data.deleted', 1);

        $this->postJson("/api/v1/rooms/{$room->id}/availability/bulk-delete", ['ids' => [$block->id]])
            ->assertSuccessful()
            ->assertJsonPath('data.deleted', 1);

        $this->assertDatabaseMissing('discount_codes', ['id' => $code->id]);
        $this->assertDatabaseMissing('room_availability', ['id' => $block->id]);
    }
}
