<?php

namespace Tests\Feature;

use App\Services\PhilippineLocationService;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhilippineLocationServicePsgcPairTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PsgcReferenceSeeder::class);
    }

    public function test_validates_province_city_when_spa_sends_extra_leading_zero_on_province(): void
    {
        $svc = app(PhilippineLocationService::class);

        $this->assertTrue($svc->isValidProvinceCityPair(
            PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            PsgcReferenceSeeder::DEMO_CITY_CODE,
        ));

        $this->assertTrue($svc->isValidProvinceCityPair(
            '0'.PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            PsgcReferenceSeeder::DEMO_CITY_CODE,
        ));
    }
}
