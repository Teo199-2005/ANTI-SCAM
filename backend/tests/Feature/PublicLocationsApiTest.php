<?php

namespace Tests\Feature;

use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicLocationsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_provinces_cities_and_barangays_endpoints_return_seeded_data(): void
    {
        $this->seed(PsgcReferenceSeeder::class);

        $this->getJson('/api/v1/public/locations/provinces')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.code', PsgcReferenceSeeder::DEMO_PROVINCE_CODE);

        $this->getJson('/api/v1/public/locations/provinces/'.PsgcReferenceSeeder::DEMO_PROVINCE_CODE.'/cities')
            ->assertOk()
            ->assertJsonPath('data.0.code', PsgcReferenceSeeder::DEMO_CITY_CODE);

        $this->getJson('/api/v1/public/locations/cities/'.PsgcReferenceSeeder::DEMO_CITY_CODE.'/barangays')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }
}
