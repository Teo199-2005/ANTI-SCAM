<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        $name = fake()->company().' Stay';
        $slug = Str::slug($name).'-'.fake()->unique()->numberBetween(100, 999);

        return [
            'name' => $name,
            'slug' => $slug,
            'subdomain' => Str::slug($name).fake()->unique()->numberBetween(10, 99),
            'status' => fake()->randomElement(['active', 'active', 'active', 'suspended']),
        ];
    }
}
