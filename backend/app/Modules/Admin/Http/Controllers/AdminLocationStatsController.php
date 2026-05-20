<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PsgcBarangay;
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

    /** @var array<string, string> */
    private array $provinceNameCache = [];

    /** @var array<string, array{city_name: string, province_name: string}> */
    private array $cityProvinceDisplayCache = [];

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

        $out = [];
        foreach ($codes as $code) {
            $out[] = [
                'province_psgc' => (string) $code,
                'province_name' => $this->resolveProvinceDisplayName((string) $code),
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

        $out = [];
        foreach ($resortRows as $row) {
            $provinceCode = (string) $row->province_code;
            $locCode = (string) $row->code;
            $pair = $this->resolveCityProvinceForResortLocation($locCode, $provinceCode);
            $out[] = [
                'city_psgc' => $locCode,
                'city_name' => $pair['city_name'],
                'province_psgc' => $provinceCode,
                'province_name' => $pair['province_name'],
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

        $out = [];
        foreach ($resortRows as $row) {
            $code = (string) $row->code;
            $out[] = [
                'province_psgc' => $code,
                'province_name' => $this->resolveProvinceDisplayName($code),
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

        $provinceName = $this->resolveProvinceDisplayName($provincePsgc);

        $out = [];
        foreach ($codes as $code) {
            $pair = $this->resolveCityProvinceForResortLocation((string) $code, $provincePsgc);
            $out[] = [
                'city_psgc' => (string) $code,
                'city_name' => $pair['city_name'],
                'province_psgc' => $provincePsgc,
                'province_name' => $pair['province_name'] !== '' ? $pair['province_name'] : $provinceName,
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

    /**
     * @return list<string>
     */
    private function psgcCodeCandidates(string $raw): array
    {
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return [];
        }

        $digits = preg_replace('/\D+/', '', $trimmed) ?? '';
        $out = [$trimmed];
        if ($digits !== '' && $digits !== $trimmed) {
            $out[] = $digits;
        }
        if ($digits !== '') {
            if (strlen($digits) < 10) {
                $padded = str_pad($digits, 10, '0', STR_PAD_LEFT);
                if (! in_array($padded, $out, true)) {
                    $out[] = $padded;
                }
            }
        }

        return array_values(array_unique(array_filter($out, static fn (string $v): bool => $v !== '')));
    }

    private function looksLikeRawPsgcDigits(string $value): bool
    {
        $digits = preg_replace('/\D+/', '', $value) ?? '';

        return $digits !== '' && (bool) preg_match('/^\d{7,12}$/', $digits);
    }

    private function humanizeUnmappedCode(string $code): string
    {
        if (! $this->looksLikeRawPsgcDigits($code)) {
            $t = trim($code);

            return $t !== '' ? $t : 'Unknown location';
        }

        return 'Unmapped geography';
    }

    private function resolveProvinceDisplayName(string $code): string
    {
        if (isset($this->provinceNameCache[$code])) {
            return $this->provinceNameCache[$code];
        }

        foreach ($this->psgcCodeCandidates($code) as $try) {
            $name = PsgcProvince::query()->where('code', $try)->value('name');
            if ($name !== null && trim((string) $name) !== '') {
                return $this->provinceNameCache[$code] = (string) $name;
            }
        }

        return $this->provinceNameCache[$code] = $this->humanizeUnmappedCode($code);
    }

    /**
     * @return array{city_name: string, province_name: string}
     */
    private function resolveCityProvinceForResortLocation(string $locCode, string $provinceFromResort): array
    {
        $key = $locCode.'|'.$provinceFromResort;
        if (isset($this->cityProvinceDisplayCache[$key])) {
            return $this->cityProvinceDisplayCache[$key];
        }

        foreach ($this->psgcCodeCandidates($locCode) as $try) {
            $city = PsgcCityMunicipality::query()->where('code', $try)->first();
            if ($city !== null) {
                $pname = $this->resolveProvinceDisplayName((string) $city->province_code);

                return $this->cityProvinceDisplayCache[$key] = [
                    'city_name' => (string) $city->name,
                    'province_name' => $pname,
                ];
            }
        }

        foreach ($this->psgcCodeCandidates($locCode) as $try) {
            $br = PsgcBarangay::query()->where('code', $try)->first();
            if ($br !== null) {
                $city = PsgcCityMunicipality::query()->where('code', $br->city_municipality_code)->first();
                if ($city !== null) {
                    $pname = $this->resolveProvinceDisplayName((string) $city->province_code);

                    return $this->cityProvinceDisplayCache[$key] = [
                        'city_name' => (string) $city->name,
                        'province_name' => $pname,
                    ];
                }
            }
        }

        $pname = $this->resolveProvinceDisplayName($provinceFromResort);

        return $this->cityProvinceDisplayCache[$key] = [
            'city_name' => '',
            'province_name' => $pname,
        ];
    }
}
