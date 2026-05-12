<?php

namespace Database\Seeders;

use App\Models\PsgcBarangay;
use App\Models\PsgcCityMunicipality;
use App\Models\PsgcProvince;
use Illuminate\Database\Seeder;

/**
 * Minimal PSGC-style hierarchy for demos and tests. Replace via `php artisan psgc:import` for production.
 */
class PsgcReferenceSeeder extends Seeder
{
    public const DEMO_PROVINCE_CODE = '100000000001';

    public const DEMO_CITY_CODE = '100000000002';

    public const DEMO_BARANGAY_CODE = '100000000003';

    public const DEMO_BARANGAY_ALT_CODE = '100000000004';

    public function run(): void
    {
        $now = now();

        PsgcProvince::query()->upsert(
            [
                ['code' => self::DEMO_PROVINCE_CODE, 'name' => 'Demo Province', 'created_at' => $now, 'updated_at' => $now],
            ],
            ['code'],
            ['name', 'updated_at'],
        );

        PsgcCityMunicipality::query()->upsert(
            [
                ['code' => self::DEMO_CITY_CODE, 'province_code' => self::DEMO_PROVINCE_CODE, 'name' => 'Demo City', 'created_at' => $now, 'updated_at' => $now],
            ],
            ['code'],
            ['province_code', 'name', 'updated_at'],
        );

        PsgcBarangay::query()->upsert(
            [
                ['code' => self::DEMO_BARANGAY_CODE, 'city_municipality_code' => self::DEMO_CITY_CODE, 'name' => 'Demo Barangay', 'created_at' => $now, 'updated_at' => $now],
                ['code' => self::DEMO_BARANGAY_ALT_CODE, 'city_municipality_code' => self::DEMO_CITY_CODE, 'name' => 'Alt Barangay', 'created_at' => $now, 'updated_at' => $now],
            ],
            ['code'],
            ['city_municipality_code', 'name', 'updated_at'],
        );
    }
}
