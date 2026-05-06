<?php

namespace Database\Factories;

use App\Models\BookingLock;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<BookingLock>
 */
class BookingLockFactory extends Factory
{
    protected $model = BookingLock::class;

    public function definition(): array
    {
        $room = Room::query()->inRandomOrder()->first() ?? RoomFactory::new()->create();
        $checkIn = now()->addDays(fake()->numberBetween(0, 20));
        $checkOut = (clone $checkIn)->addDays(fake()->numberBetween(1, 3));

        return [
            'tenant_id' => $room->tenant_id,
            'room_id' => $room->id,
            'lock_token' => (string) Str::uuid(),
            'check_in_date' => $checkIn->toDateString(),
            'check_out_date' => $checkOut->toDateString(),
            'expires_at' => now()->addMinutes(fake()->numberBetween(5, 20)),
            'status' => fake()->randomElement(['locked', 'released', 'converted']),
        ];
    }
}
