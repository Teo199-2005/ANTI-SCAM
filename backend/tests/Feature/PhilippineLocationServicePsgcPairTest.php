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

    public function test_validates_when_spa_puts_city_psgc_in_province_slot_flat_picker(): void
    {
        $svc = app(PhilippineLocationService::class);

        $this->assertTrue($svc->isValidProvinceCityPair(
            PsgcReferenceSeeder::DEMO_CITY_CODE,
            PsgcReferenceSeeder::DEMO_CITY_CODE,
        ));
    }

    public function test_canonical_province_for_mailing_when_province_slot_is_city_code(): void
    {
        $svc = app(PhilippineLocationService::class);

        $this->assertSame(
            PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            $svc->canonicalProvinceCodeForMailing(
                PsgcReferenceSeeder::DEMO_CITY_CODE,
                PsgcReferenceSeeder::DEMO_CITY_CODE,
            ),
        );
    }
}
