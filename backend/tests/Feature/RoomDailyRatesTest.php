<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Room;
use App\Models\RoomDailyRate;
use App\Models\User;
use Database\Seeders\DemoLoginAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoomDailyRatesTest extends TestCase
{
    use RefreshDatabase;

    private function demoRoom(): Room
    {
        $this->seed(DemoLoginAccountsSeeder::class);
        $owner = User::where('email', 'owner@resort.test')->firstOrFail();
        $resort = Resort::withoutGlobalScopes()->where('tenant_id', $owner->tenant_id)->firstOrFail();

        return Room::withoutGlobalScopes()->create([
            'tenant_id' => $owner->tenant_id,
            'resort_id' => $resort->id,
            'name' => 'Family Loft',
            'code' => 'FL1',
            'status' => 'active',
            'base_price' => 5000,
            'capacity' => 4,
            'units' => 1,
        ]);
    }

    public function test_resort_owner_can_set_rates_for_selected_dates_only(): void
    {
        $room = $this->demoRoom();
        $owner = User::where('email', 'owner@resort.test')->firstOrFail();

        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/rooms/{$room->id}/daily-rates", [
            'dates' => ['2026-06-19', '2026-06-20', '2026-06-21'],
            'nightly_price' => 8500,
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertSame(3, RoomDailyRate::withoutGlobalScopes()->where('room_id', $room->id)->count());
        $this->assertSame(
            8500.0,
            (float) RoomDailyRate::withoutGlobalScopes()
                ->where('room_id', $room->id)
                ->whereDate('date', '2026-06-19')
                ->value('nightly_price'),
        );
        $this->assertNull(
            RoomDailyRate::withoutGlobalScopes()
                ->where('room_id', $room->id)
                ->whereDate('date', '2026-06-22')
                ->value('id'),
        );

        $room->refresh();
        $this->assertSame(5000.0, (float) $room->base_price);

        $this->getJson("/api/v1/rooms/{$room->id}/daily-rates?year=2026&month=6")
            ->assertOk()
            ->assertJsonPath('data.rates.2026-06-19', 8500)
            ->assertJsonPath('data.rates.2026-06-20', 8500);
    }

    public function test_setting_rate_equal_to_base_price_removes_override(): void
    {
        $room = $this->demoRoom();
        $owner = User::where('email', 'owner@resort.test')->firstOrFail();
        $base = (float) $room->base_price;

        RoomDailyRate::withoutGlobalScopes()->create([
            'tenant_id' => $room->tenant_id,
            'room_id' => $room->id,
            'date' => '2026-06-19',
            'nightly_price' => 9999,
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/rooms/{$room->id}/daily-rates", [
            'dates' => ['2026-06-19'],
            'nightly_price' => $base,
        ])->assertOk();

        $this->assertNull(
            RoomDailyRate::withoutGlobalScopes()
                ->where('room_id', $room->id)
                ->whereDate('date', '2026-06-19')
                ->value('id'),
        );
    }
}
