<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PsgcCityMunicipality;
use App\Models\PsgcProvince;
use App\Models\Resort;
use App\Models\User;
use App\Support\CacheSafe;
use App\Support\ResortLocationQuery;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminLocationStatsController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $location = ResortLocationQuery::fromRequest($request);
        $provincePsgc = $location['province_psgc'];
        $cityPsgc = $location['city_municipality_psgc'];

        $cacheKey = 'dashboard:admin_location_stats:'.md5(($provincePsgc ?? '').':'.($cityPsgc ?? ''));

        $payload = CacheSafe::remember($cacheKey, now()->addSeconds(45), function () use ($provincePsgc, $cityPsgc) {
            if ($cityPsgc !== null) {
                return [
                    'by_province' => [],
                    'by_city' => $this->rowsByCity($provincePsgc, $cityPsgc),
                    'top_resorts' => $this->topResortsByLocation($provincePsgc, $cityPsgc, 5),
                    'filtered_totals' => $this->filteredTotals($provincePsgc, $cityPsgc),
                ];
            }

            return [
                'by_province' => $this->rowsByProvince(),
                'by_city' => $provincePsgc !== null ? $this->rowsByCity($provincePsgc, null) : [],
                'top_resorts' => $this->topResortsByLocation($provincePsgc, $cityPsgc, 5),
                'filtered_totals' => $this->filteredTotals($provincePsgc, $cityPsgc),
            ];
        });

        return $this->successResponse($payload, 'Location stats fetched');
    }

    /**
     * @return list<array{province_psgc: string, province_name: string, resort_count: int, owner_count: int}>
     */
    private function rowsByProvince(): array
    {
        $resortRows = Resort::withoutGlobalScopes()
            ->whereNotNull('address_province_psgc')
            ->selectRaw('address_province_psgc as code, COUNT(*) as resort_count')
            ->groupBy('address_province_psgc')
            ->get()
            ->keyBy('code');

        $ownerRows = DB::table('users')
            ->join('resorts', 'resorts.tenant_id', '=', 'users.tenant_id')
            ->where('users.role', 'resort_owner')
            ->whereNotNull('resorts.address_province_psgc')
            ->selectRaw('resorts.address_province_psgc as code, COUNT(DISTINCT users.id) as owner_count')
            ->groupBy('resorts.address_province_psgc')
            ->get()
            ->keyBy('code');

        $codes = $resortRows->keys()->merge($ownerRows->keys())->unique()->filter();

        $names = PsgcProvince::query()
            ->whereIn('code', $codes)
            ->pluck('name', 'code');

        $out = [];
        foreach ($codes as $code) {
            $out[] = [
                'province_psgc' => (string) $code,
                'province_name' => (string) ($names[$code] ?? $code),
                'resort_count' => (int) ($resortRows[$code]->resort_count ?? 0),
                'owner_count' => (int) ($ownerRows[$code]->owner_count ?? 0),
            ];
        }

        usort($out, static fn (array $a, array $b): int => $b['resort_count'] <=> $a['resort_count']);

        return $out;
    }

    /**
     * @return list<array{location_label: string, resort_count: int}>
     */
    private function topResortsByLocation(?string $provincePsgc, ?string $cityPsgc, int $limit = 5): array
    {
        $rows = match (true) {
            $cityPsgc !== null && $provincePsgc !== null => $this->rowsByCity($provincePsgc, $cityPsgc),
            $provincePsgc !== null => $this->rowsByCity($provincePsgc, null),
            default => array_merge($this->rowsByCityNationwide(), $this->rowsByProvinceOnlyResorts()),
        };

        usort($rows, static fn (array $a, array $b): int => $b['resort_count'] <=> $a['resort_count']);

        $out = [];
        foreach (array_slice($rows, 0, $limit) as $row) {
            $out[] = [
                'location_label' => $this->locationLabelFromRow($row),
                'resort_count' => (int) $row['resort_count'],
            ];
        }

        return $out;
    }

    /**
     * @return list<array{city_psgc: string, city_name: string, province_psgc: string, province_name: string, resort_count: int, owner_count: int}>
     */
    private function rowsByCityNationwide(): array
    {
        $resortRows = Resort::withoutGlobalScopes()
            ->whereNotNull('address_city_municipality_psgc')
            ->selectRaw('address_city_municipality_psgc as code, address_province_psgc as province_code, COUNT(*) as resort_count')
            ->groupBy('address_city_municipality_psgc', 'address_province_psgc')
            ->get();

        if ($resortRows->isEmpty()) {
            return [];
        }

        $cityCodes = $resortRows->pluck('code')->unique()->filter()->values();
        $provinceCodes = $resortRows->pluck('province_code')->unique()->filter()->values();

        $cityNames = PsgcCityMunicipality::query()
            ->whereIn('code', $cityCodes)
            ->pluck('name', 'code');
        $provinceNames = PsgcProvince::query()
            ->whereIn('code', $provinceCodes)
            ->pluck('name', 'code');

        $out = [];
        foreach ($resortRows as $row) {
            $provinceCode = (string) $row->province_code;
            $out[] = [
                'city_psgc' => (string) $row->code,
                'city_name' => (string) ($cityNames[$row->code] ?? $row->code),
                'province_psgc' => $provinceCode,
                'province_name' => (string) ($provinceNames[$provinceCode] ?? $provinceCode),
                'resort_count' => (int) $row->resort_count,
                'owner_count' => 0,
            ];
        }

        usort($out, static fn (array $a, array $b): int => $b['resort_count'] <=> $a['resort_count']);

        return $out;
    }

    /**
     * Resorts with a province but no city/municipality on file.
     *
     * @return list<array{province_psgc: string, province_name: string, resort_count: int, owner_count: int}>
     */
    private function rowsByProvinceOnlyResorts(): array
    {
        $resortRows = Resort::withoutGlobalScopes()
            ->whereNotNull('address_province_psgc')
            ->whereNull('address_city_municipality_psgc')
            ->selectRaw('address_province_psgc as code, COUNT(*) as resort_count')
            ->groupBy('address_province_psgc')
            ->get();

        if ($resortRows->isEmpty()) {
            return [];
        }

        $names = PsgcProvince::query()
            ->whereIn('code', $resortRows->pluck('code'))
            ->pluck('name', 'code');

        $out = [];
        foreach ($resortRows as $row) {
            $code = (string) $row->code;
            $out[] = [
                'province_psgc' => $code,
                'province_name' => (string) ($names[$code] ?? $code),
                'resort_count' => (int) $row->resort_count,
                'owner_count' => 0,
            ];
        }

        usort($out, static fn (array $a, array $b): int => $b['resort_count'] <=> $a['resort_count']);

        return $out;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function locationLabelFromRow(array $row): string
    {
        $cityName = isset($row['city_name']) ? trim((string) $row['city_name']) : '';
        if ($cityName !== '') {
            $provinceName = isset($row['province_name']) ? trim((string) $row['province_name']) : '';

            return $provinceName !== '' ? "{$cityName}, {$provinceName}" : $cityName;
        }

        $provinceName = isset($row['province_name']) ? trim((string) $row['province_name']) : '';
        if ($provinceName !== '') {
            return $provinceName;
        }

        return 'Unknown location';
    }

    /**
     * @return list<array{city_psgc: string, city_name: string, province_psgc: string, resort_count: int, owner_count: int}>
     */
    private function rowsByCity(string $provincePsgc, ?string $cityPsgc): array
    {
        $resortQuery = Resort::withoutGlobalScopes()
            ->where('address_province_psgc', $provincePsgc)
            ->when($cityPsgc !== null, fn ($q) => $q->where('address_city_municipality_psgc', $cityPsgc))
            ->whereNotNull('address_city_municipality_psgc');

        $resortRows = (clone $resortQuery)
            ->selectRaw('address_city_municipality_psgc as code, address_province_psgc as province_code, COUNT(*) as resort_count')
            ->groupBy('address_city_municipality_psgc', 'address_province_psgc')
            ->get()
            ->keyBy('code');

        $ownerRows = DB::table('users')
            ->join('resorts', 'resorts.tenant_id', '=', 'users.tenant_id')
            ->where('users.role', 'resort_owner')
            ->where('resorts.address_province_psgc', $provincePsgc)
            ->when($cityPsgc !== null, fn ($q) => $q->where('resorts.address_city_municipality_psgc', $cityPsgc))
            ->whereNotNull('resorts.address_city_municipality_psgc')
            ->selectRaw('resorts.address_city_municipality_psgc as code, COUNT(DISTINCT users.id) as owner_count')
            ->groupBy('resorts.address_city_municipality_psgc')
            ->get()
            ->keyBy('code');

        $codes = $resortRows->keys()->merge($ownerRows->keys())->unique()->filter();

        $names = PsgcCityMunicipality::query()
            ->whereIn('code', $codes)
            ->pluck('name', 'code');

        $provinceName = (string) (PsgcProvince::query()->where('code', $provincePsgc)->value('name') ?? $provincePsgc);

        $out = [];
        foreach ($codes as $code) {
            $out[] = [
                'city_psgc' => (string) $code,
                'city_name' => (string) ($names[$code] ?? $code),
                'province_psgc' => $provincePsgc,
                'province_name' => $provinceName,
                'resort_count' => (int) ($resortRows[$code]->resort_count ?? 0),
                'owner_count' => (int) ($ownerRows[$code]->owner_count ?? 0),
            ];
        }

        usort($out, static fn (array $a, array $b): int => $b['resort_count'] <=> $a['resort_count']);

        return $out;
    }

    /**
     * @return array{resort_count: int, owner_count: int}
     */
    private function filteredTotals(?string $provincePsgc, ?string $cityPsgc): array
    {
        if ($provincePsgc === null && $cityPsgc === null) {
            return [
                'resort_count' => Resort::withoutGlobalScopes()->count(),
                'owner_count' => User::query()->where('role', 'resort_owner')->count(),
            ];
        }

        $resortQuery = Resort::withoutGlobalScopes();
        ResortLocationQuery::applyToResortColumns($resortQuery, $provincePsgc, $cityPsgc);

        $ownerQuery = User::query()->where('role', 'resort_owner');
        ResortLocationQuery::whereUserTenantHasResortLocation($ownerQuery, $provincePsgc, $cityPsgc);

        return [
            'resort_count' => $resortQuery->count(),
            'owner_count' => $ownerQuery->count(),
        ];
    }
}
