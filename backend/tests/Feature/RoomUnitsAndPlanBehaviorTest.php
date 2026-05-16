<?php

namespace Tests\Feature;

use App\Models\BookingLock;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoomUnitsAndPlanBehaviorTest extends TestCase
{
    use RefreshDatabase;

    public function test_two_parallel_locks_allowed_when_room_units_is_two(): void
    {
        $env = $this->makeTenantResortRoom(units: 2);

        $guest = User::factory()->create([
            'tenant_id' => $env['tenant']->id,
            'role' => 'client',
        ]);
        Sanctum::actingAs($guest);

        $in = now()->addDays(10)->toDateString();
        $out = now()->addDays(12)->toDateString();

        $first = $this->postJson('/api/v1/booking-locks', [
            'room_id' => $env['room']->id,
            'check_in_date' => $in,
            'check_out_date' => $out,
        ]);
        $first->assertCreated();

        $second = $this->postJson('/api/v1/booking-locks', [
            'room_id' => $env['room']->id,
            'check_in_date' => $in,
            'check_out_date' => $out,
        ]);
        $second->assertCreated();

        $this->assertSame(2, BookingLock::withoutGlobalScopes()->where('room_id', $env['room']->id)->where('status', 'locked')->count());
    }

    public function test_third_parallel_lock_rejected_when_room_units_is_two(): void
    {
        $env = $this->makeTenantResortRoom(units: 2);

        $guest = User::factory()->create([
            'tenant_id' => $env['tenant']->id,
            'role' => 'client',
        ]);
        Sanctum::actingAs($guest);

        $in = now()->addDays(10)->toDateString();
        $out = now()->addDays(12)->toDateString();

        $this->postJson('/api/v1/booking-locks', [
            'room_id' => $env['room']->id,
            'check_in_date' => $in,
            'check_out_date' => $out,
        ])->assertCreated();

        $this->postJson('/api/v1/booking-locks', [
            'room_id' => $env['room']->id,
            'check_in_date' => $in,
            'check_out_date' => $out,
        ])->assertCreated();

        $third = $this->postJson('/api/v1/booking-locks', [
            'room_id' => $env['room']->id,
            'check_in_date' => $in,
            'check_out_date' => $out,
        ]);
        $third->assertStatus(409);
    }

    public function test_activating_room_deactivates_others_when_included_rooms_is_one(): void
    {
        $tenant = Tenant::create([
            'name' => 'Plan Tenant',
            'slug' => 'plan-tenant',
            'subdomain' => 'plantest',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Plan Resort',
            'is_publicly_listed' => true,
        ]);

        Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2000,
            'included_rooms' => 1,
            'extra_room_fee' => 300,
            'active_room_count' => 1,
            'total_monthly_fee' => 2000,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);

        $roomA = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Room A',
            'code' => 'RA',
            'status' => 'active',
            'base_price' => 1000,
            'capacity' => 2,
            'units' => 1,
        ]);

        $roomB = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Room B',
            'code' => 'RB',
            'status' => 'inactive',
            'base_price' => 1100,
            'capacity' => 2,
            'units' => 1,
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);
        Sanctum::actingAs($owner);

        $this->putJson("/api/v1/rooms/{$roomB->id}", [
            'name' => 'Room B',
            'code' => 'RB',
            'capacity' => 2,
            'units' => 1,
            'base_price' => 1100,
            'amenities' => ['BED_COUNT:1', 'BED_TYPE:Double'],
            'rules' => null,
            'status' => 'active',
        ])->assertOk();

        $roomA->refresh();
        $roomB->refresh();

        $this->assertSame('inactive', $roomA->status);
        $this->assertSame('active', $roomB->status);
    }

    public function test_resort_owner_cannot_upload_images_for_another_tenants_room(): void
    {
        Storage::fake('public');

        $tenant = Tenant::create([
            'name' => 'Owner Tenant',
            'slug' => 'owner-tenant',
            'subdomain' => 'ownertest',
            'status' => 'active',
        ]);

        $other = Tenant::create([
            'name' => 'Other Tenant',
            'slug' => 'other-tenant',
            'subdomain' => 'othertest',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Owner Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Owner Room',
            'code' => 'OR',
            'status' => 'active',
            'base_price' => 500,
            'capacity' => 2,
            'units' => 1,
        ]);

        $intruder = User::factory()->create([
            'tenant_id' => $other->id,
            'role' => 'resort_owner',
        ]);
        Sanctum::actingAs($intruder);

        $file = UploadedFile::fake()->image('room.jpg', 40, 40);

        $this->post("/api/v1/rooms/{$room->id}/images", ['images' => [$file]])
            ->assertForbidden();
    }

    public function test_room_images_total_capped_at_five_across_requests(): void
    {
        Storage::fake('public');

        $tenant = Tenant::create([
            'name' => 'Img Tenant',
            'slug' => 'img-tenant',
            'subdomain' => 'imgtest',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Img Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Photo Room',
            'code' => 'PR',
            'status' => 'active',
            'base_price' => 500,
            'capacity' => 2,
            'units' => 1,
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);
        Sanctum::actingAs($owner);

        $files = fn (int $n) => collect(range(1, $n))->map(fn () => UploadedFile::fake()->image('r.jpg', 40, 40))->all();

        $this->post("/api/v1/rooms/{$room->id}/images", ['images' => $files(5)])
            ->assertCreated();

        $overflow = $this->post("/api/v1/rooms/{$room->id}/images", ['images' => $files(1)]);
        $overflow->assertStatus(422);
    }

    /** @return array{tenant: Tenant, resort: Resort, room: Room} */
    private function makeTenantResortRoom(int $units): array
    {
        $tenant = Tenant::create([
            'name' => 'Lock Tenant',
            'slug' => 'lock-tenant',
            'subdomain' => 'locktest',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Lock Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Twin Suite',
            'code' => 'TS',
            'status' => 'active',
            'base_price' => 2000,
            'capacity' => 4,
            'units' => $units,
        ]);

        return compact('tenant', 'resort', 'room');
    }
}
