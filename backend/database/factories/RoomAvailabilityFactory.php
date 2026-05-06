<?php

namespace Database\Factories;

use App\Models\Room;
use App\Models\RoomAvailability;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RoomAvailability>
 */
class RoomAvailabilityFactory extends Factory
{
    protected $model = RoomAvailability::class;

    public function definition(): array
    {
        $room = Room::query()->inRandomOrder()->first() ?? RoomFactory::new()->create();
        $start = now()->addDays(fake()->numberBetween(-15, 45));
        $end = (clone $start)->addDays(fake()->numberBetween(1, 5));
        $status = fake()->randomElement(['available', 'blocked', 'maintenance']);

        return [
            'tenant_id' => $room->tenant_id,
            'room_id' => $room->id,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'status' => $status,
            'reason' => $status === 'available' ? null : fake()->sentence(6),
        ];
    }
}
