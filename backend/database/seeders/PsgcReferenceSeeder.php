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
    /** Aligned with PSA PSGC 2025-2Q / @jobuntux/psgc dataset (Abra, Bangued). */
    public const DEMO_PROVINCE_CODE = '1400100000';

    public const DEMO_CITY_CODE = '1400101000';

    public const DEMO_BARANGAY_CODE = '1400101001';

    public const DEMO_BARANGAY_ALT_CODE = '1400101002';

    public function run(): void
    {
        $now = now();

        PsgcProvince::query()->upsert(
            [
                ['code' => self::DEMO_PROVINCE_CODE, 'name' => 'Abra', 'created_at' => $now, 'updated_at' => $now],
            ],
            ['code'],
            ['name', 'updated_at'],
        );

        PsgcCityMunicipality::query()->upsert(
            [
                ['code' => self::DEMO_CITY_CODE, 'province_code' => self::DEMO_PROVINCE_CODE, 'name' => 'Bangued', 'created_at' => $now, 'updated_at' => $now],
            ],
            ['code'],
            ['province_code', 'name', 'updated_at'],
        );

        PsgcBarangay::query()->upsert(
            [
                ['code' => self::DEMO_BARANGAY_CODE, 'city_municipality_code' => self::DEMO_CITY_CODE, 'name' => 'Agtangao', 'created_at' => $now, 'updated_at' => $now],
                ['code' => self::DEMO_BARANGAY_ALT_CODE, 'city_municipality_code' => self::DEMO_CITY_CODE, 'name' => 'Angad', 'created_at' => $now, 'updated_at' => $now],
            ],
            ['code'],
            ['city_municipality_code', 'name', 'updated_at'],
        );
    }
}
