<?php

namespace Database\Factories;

use App\Models\Resort;
use App\Models\Tenant;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Resort>
 */
class ResortFactory extends Factory
{
    protected $model = Resort::class;

    public function definition(): array
    {
        $labels = ['Azure Sands', 'Palm Crest', 'Coral Bay', 'Sunrise Cove', 'Luna Ridge', 'Harbor Bliss'];
        $prefix = fake()->randomElement($labels);

        return [
            'tenant_id' => Tenant::query()->inRandomOrder()->value('id') ?? TenantFactory::new()->create()->id,
            'name' => $prefix.' Resort '.fake()->numberBetween(1, 99),
            'description' => fake()->sentence(14),
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
            'address_label' => null,
            'contact_number' => '+63 9'.fake()->numerify('#########'),
            'is_publicly_listed' => fake()->boolean(80),
        ];
    }
}
