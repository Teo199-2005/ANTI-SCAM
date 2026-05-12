<?php

namespace App\Console\Commands;

use App\Models\PsgcBarangay;
use App\Models\PsgcCityMunicipality;
use App\Models\PsgcProvince;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportPsgcCommand extends Command
{
    protected $signature = 'psgc:import {path : Directory containing provinces.json, cities.json, barangays.json}';

    protected $description = 'Replace PSGC reference tables from JSON exports (see backend/README.md).';

    public function handle(): int
    {
        $base = rtrim((string) $this->argument('path'), DIRECTORY_SEPARATOR);
        $provPath = $base.DIRECTORY_SEPARATOR.'provinces.json';
        $cityPath = $base.DIRECTORY_SEPARATOR.'cities.json';
        $brPath = $base.DIRECTORY_SEPARATOR.'barangays.json';

        foreach ([$provPath, $cityPath, $brPath] as $p) {
            if (! is_readable($p)) {
                $this->error("Missing or unreadable file: {$p}");

                return self::FAILURE;
            }
        }

        $provinces = json_decode((string) file_get_contents($provPath), true);
        $cities = json_decode((string) file_get_contents($cityPath), true);
        $barangays = json_decode((string) file_get_contents($brPath), true);

        if (! is_array($provinces) || ! is_array($cities) || ! is_array($barangays)) {
            $this->error('Each JSON file must contain a top-level array.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($provinces, $cities, $barangays): void {
            PsgcBarangay::query()->delete();
            PsgcCityMunicipality::query()->delete();
            PsgcProvince::query()->delete();

            $now = now();
            foreach ($provinces as $row) {
                if (! is_array($row) || ! isset($row['code'], $row['name'])) {
                    continue;
                }
                PsgcProvince::query()->insert([
                    'code' => (string) $row['code'],
                    'name' => (string) $row['name'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ($cities as $row) {
                if (! is_array($row) || ! isset($row['code'], $row['province_code'], $row['name'])) {
                    continue;
                }
                PsgcCityMunicipality::query()->insert([
                    'code' => (string) $row['code'],
                    'province_code' => (string) $row['province_code'],
                    'name' => (string) $row['name'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ($barangays as $row) {
                if (! is_array($row) || ! isset($row['code'], $row['city_municipality_code'], $row['name'])) {
                    continue;
                }
                PsgcBarangay::query()->insert([
                    'code' => (string) $row['code'],
                    'city_municipality_code' => (string) $row['city_municipality_code'],
                    'name' => (string) $row['name'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        });

        $this->info('PSGC tables rebuilt from JSON.');

        return self::SUCCESS;
    }
}
