<?php

namespace Database\Factories;

use App\Models\Resort;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Room>
 */
class RoomFactory extends Factory
{
    protected $model = Room::class;

    public function definition(): array
    {
        $resort = Resort::query()->inRandomOrder()->first() ?? ResortFactory::new()->create();
        $capacity = fake()->numberBetween(2, 8);
        $suffix = strtoupper(fake()->bothify('RM-##??'));

        return [
            'tenant_id' => $resort->tenant_id,
            'resort_id' => $resort->id,
            'name' => fake()->randomElement(['Deluxe Suite', 'Ocean View', 'Garden Villa', 'Family Loft']).' '.fake()->numberBetween(1, 40),
            'code' => $suffix,
            'capacity' => $capacity,
            'units' => 1,
            'base_price' => fake()->randomFloat(2, 1800, 12500),
            'amenities' => fake()->randomElements(['WiFi', 'TV', 'Mini Bar', 'Pool Access', 'Balcony', 'Breakfast'], fake()->numberBetween(2, 5)),
            'rules' => fake()->sentence(10),
            'status' => fake()->randomElement(['active', 'active', 'inactive']),
        ];
    }
}
