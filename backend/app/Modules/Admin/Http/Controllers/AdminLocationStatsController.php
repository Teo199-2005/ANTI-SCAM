<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PsgcBarangay;
use App\Models\PsgcCityMunicipality;
use App\Models\PsgcProvince;
use App\Models\Resort;
use App\Models\User;
use App\Services\PhilippineLocationService;
use App\Support\CacheSafe;
use App\Support\PsgcCode;
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

    private ?string $hintProvincePsgc = null;

    private ?string $hintProvinceLabel = null;

    private ?string $hintCityPsgc = null;

    private ?string $hintCityLabel = null;

    public function index(Request $request)
    {
        $location = ResortLocationQuery::fromRequest($request);
        $provincePsgc = $location['province_psgc'];
        $cityPsgc = $location['city_municipality_psgc'];
        $provinceDisplay = $location['province_display'] ?? null;
        $cityDisplay = $location['city_display'] ?? null;

        $cacheKey = 'dashboard:admin_location_stats:'.md5(implode(':', [
            $provincePsgc ?? '',
            $cityPsgc ?? '',
            $provinceDisplay ?? '',
            $cityDisplay ?? '',
        ]));

        $payload = CacheSafe::remember($cacheKey, now()->addSeconds(45), function () use ($provincePsgc, $cityPsgc, $provinceDisplay, $cityDisplay) {
            $this->beginLocationHintScope($provincePsgc, $cityPsgc, $provinceDisplay, $cityDisplay);
            try {
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
            } finally {
                $this->endLocationHintScope();
            }
        });

        return $this->successResponse($payload, 'Location stats fetched');
    }

    private function beginLocationHintScope(
        ?string $provincePsgc,
        ?string $cityPsgc,
        ?string $provinceDisplay,
        ?string $cityDisplay,
    ): void {
        $this->hintProvincePsgc = $provincePsgc;
        $this->hintProvinceLabel = $provinceDisplay;
        $this->hintCityPsgc = $cityPsgc;
        $this->hintCityLabel = $cityDisplay;
    }

    private function endLocationHintScope(): void
    {
        $this->hintProvincePsgc = null;
        $this->hintProvinceLabel = null;
        $this->hintCityPsgc = null;
        $this->hintCityLabel = null;
        $this->provinceNameCache = [];
        $this->cityProvinceDisplayCache = [];
    }

    private function matchesHintProvince(string $code): bool
    {
        if ($this->hintProvincePsgc === null || $this->hintProvinceLabel === null) {
            return false;
        }

        return PsgcCode::same($code, $this->hintProvincePsgc);
    }

    private function matchesHintCity(string $code): bool
    {
        if ($this->hintCityPsgc === null || $this->hintCityLabel === null) {
            return false;
        }

        return PsgcCode::same($code, $this->hintCityPsgc);
    }

    /**
     * @return array{city: string, province: string}|null
     */
    private function inferCityProvinceLabelsFromResort(?Resort $res): ?array
    {
        if ($res === null) {
            return null;
        }

        $street = is_string($res->address_street_line) ? trim($res->address_street_line) : '';
        $barangay = is_string($res->address_barangay_name) ? trim($res->address_barangay_name) : '';

        if (is_string($res->address_label) && trim($res->address_label) !== '') {
            $suffix = $this->normalizeLabelSuffixForLocationStats(
                trim($res->address_label),
                $res->address_street_line,
                $res->address_barangay_name,
            );
            $parsed = $this->parseCityProvinceFromAddressLabel($suffix, $street, $barangay);
            if ($parsed['city'] !== '' || $parsed['province'] !== '') {
                return $parsed;
            }
        }

        $line = app(PhilippineLocationService::class)->resortDisplayLine($res);
        if (! is_string($line) || trim($line) === '') {
            return null;
        }

        $suffix = $this->normalizeLabelSuffixForLocationStats(
            trim($line),
            $res->address_street_line,
            $res->address_barangay_name,
        );
        $parsed = $this->parseCityProvinceFromAddressLabel($suffix, $street, $barangay);
        if ($parsed['city'] === '' && $parsed['province'] === '') {
            return null;
        }

        return $parsed;
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
            default => $this->rowsForTopResortsNationwideMerged(),
        };

        usort($rows, static fn (array $a, array $b): int => $b['resort_count'] <=> $a['resort_count']);

        $out = [];
        foreach (array_slice($rows, 0, $limit) as $row) {
            $label = isset($row['location_label']) && is_string($row['location_label']) && trim($row['location_label']) !== ''
                ? $this->sanitizeLocationLabelPart((string) $row['location_label'])
                : $this->locationLabelFromRow($row);
            $out[] = [
                'location_label' => $label,
                'resort_count' => (int) $row['resort_count'],
            ];
        }

        return $out;
    }

    /**
     * Nationwide top list: merge SQL buckets that resolve to the same human label (e.g. same city/province from PSGC).
     *
     * @return list<array{location_label: string, resort_count: int}>
     */
    private function rowsForTopResortsNationwideMerged(): array
    {
        /** @var array<string, array{location_label: string, resort_count: int}> $merge */
        $merge = [];

        $put = function (string $label, int $count) use (&$merge): void {
            $norm = mb_strtolower($this->sanitizeLocationLabelPart($label));
            if ($norm === '' || $norm === mb_strtolower('Unknown location')) {
                return;
            }
            if (! isset($merge[$norm])) {
                $merge[$norm] = [
                    'location_label' => $this->sanitizeLocationLabelPart($label),
                    'resort_count' => 0,
                ];
            }
            $merge[$norm]['resort_count'] += $count;
        };

        $pairRows = Resort::withoutGlobalScopes()
            ->whereNotNull('address_province_psgc')
            ->whereNotNull('address_city_municipality_psgc')
            ->selectRaw('address_province_psgc as p, address_city_municipality_psgc as c, COUNT(*) as n')
            ->groupBy('address_province_psgc', 'address_city_municipality_psgc')
            ->get();

        foreach ($pairRows as $row) {
            $label = $this->labelForProvinceCityAggregate((string) $row->p, (string) $row->c);
            $put($label, (int) $row->n);
        }

        $provOnly = Resort::withoutGlobalScopes()
            ->whereNotNull('address_province_psgc')
            ->whereNull('address_city_municipality_psgc')
            ->selectRaw('address_province_psgc as p, COUNT(*) as n')
            ->groupBy('address_province_psgc')
            ->get();

        foreach ($provOnly as $row) {
            $p = (string) $row->p;
            $name = $this->resolveProvinceDisplayName($p, true);
            $label = $this->locationLabelFromRow([
                'city_name' => '',
                'province_name' => $name,
            ]);
            $put($label, (int) $row->n);
        }

        $list = array_values($merge);
        usort($list, static fn (array $a, array $b): int => $b['resort_count'] <=> $a['resort_count']);

        return $list;
    }

    private function labelForProvinceCityAggregate(string $provincePsgc, string $cityPsgc): string
    {
        $svc = app(PhilippineLocationService::class);
        $fromDb = $svc->administrativeAreaLabelFromCodes($provincePsgc, $cityPsgc);
        if ($fromDb !== null && trim($fromDb) !== '') {
            return $this->sanitizeLocationLabelPart($fromDb);
        }

        $res = $this->firstRepresentativeResort($provincePsgc, $cityPsgc, 'both');
        $labels = $this->inferCityProvinceLabelsFromResort($res);
        if ($labels !== null && ($labels['city'] !== '' || $labels['province'] !== '')) {
            $label = $this->locationLabelFromRow([
                'city_name' => $labels['city'],
                'province_name' => $labels['province'],
            ]);
            if ($label !== 'Unknown location') {
                return $label;
            }
        }

        $pair = $this->resolveCityProvinceForResortLocation($cityPsgc, $provincePsgc);

        return $this->locationLabelFromRow([
            'city_name' => $pair['city_name'],
            'province_name' => $pair['province_name'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function locationLabelFromRow(array $row): string
    {
        $cityName = isset($row['city_name']) ? $this->sanitizeLocationLabelPart((string) $row['city_name']) : '';
        if ($cityName !== '') {
            $provinceName = isset($row['province_name']) ? $this->sanitizeLocationLabelPart((string) $row['province_name']) : '';
            if ($provinceName !== '' && strcasecmp($cityName, $provinceName) === 0) {
                return $cityName;
            }

            return $provinceName !== '' ? "{$cityName}, {$provinceName}" : $cityName;
        }

        $provinceName = isset($row['province_name']) ? $this->sanitizeLocationLabelPart((string) $row['province_name']) : '';
        if ($provinceName !== '') {
            return $provinceName;
        }

        return 'Unknown location';
    }

    /**
     * Strip leading/trailing punctuation and odd spaces (e.g. ". District 1" from partial CSV/map labels).
     */
    private function sanitizeLocationLabelPart(string $value): string
    {
        $s = trim($value);
        $s = preg_replace('/^[\s\p{Z}\p{P}]+/u', '', $s) ?? '';
        $s = preg_replace('/[\s\p{Z}\p{P}]+$/u', '', $s) ?? '';
        $s = preg_replace('/\s+/u', ' ', $s) ?? '';

        return trim($s);
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

        $digits = preg_replace('/\D+/', '', $code) ?? '';

        return 'PSGC '.$digits;
    }

    private function resolveProvinceDisplayName(string $code, bool $provinceBucketWithoutCity = false): string
    {
        $cacheKey = $code.'|pc='.($provinceBucketWithoutCity ? '1' : '0');
        if (isset($this->provinceNameCache[$cacheKey])) {
            return $this->provinceNameCache[$cacheKey];
        }

        foreach (PsgcCode::candidates($code) as $try) {
            $name = PsgcProvince::query()->where('code', $try)->value('name');
            if ($name !== null && trim((string) $name) !== '') {
                return $this->provinceNameCache[$cacheKey] = (string) $name;
            }
        }

        if ($this->matchesHintProvince($code)) {
            $hint = $this->hintProvinceLabel;
            $hint = is_string($hint) ? trim($hint) : '';
            if ($hint !== '') {
                return $this->provinceNameCache[$cacheKey] = $hint;
            }
        }

        $mode = $provinceBucketWithoutCity ? 'province_city_null' : 'province_any';
        $res = $this->firstRepresentativeResort($code, null, $mode);
        $labels = $this->inferCityProvinceLabelsFromResort($res);
        if ($labels !== null) {
            $label = $labels['province'] !== ''
                ? $labels['province']
                : ($labels['city'] !== '' ? $labels['city'] : null);
            if ($label !== null && $label !== '') {
                return $this->provinceNameCache[$cacheKey] = $label;
            }
        }

        return $this->provinceNameCache[$cacheKey] = $this->humanizeUnmappedCode($code);
    }

    /**
     * @param  'both'|'province_city_null'|'province_any'  $mode
     */
    private function firstRepresentativeResort(string $provincePsgc, ?string $cityPsgc, string $mode): ?Resort
    {
        $columns = [
            'id',
            'address_label',
            'address_street_line',
            'address_barangay_name',
            'address_province_psgc',
            'address_city_municipality_psgc',
            'address_barangay_psgc',
        ];

        foreach (PsgcCode::candidates($provincePsgc) as $provTry) {
            $base = Resort::withoutGlobalScopes()->where('address_province_psgc', $provTry);

            if ($mode === 'province_city_null') {
                $base->whereNull('address_city_municipality_psgc');
            } elseif ($mode === 'both') {
                if ($cityPsgc === null || $cityPsgc === '') {
                    return null;
                }
                $cityCandidates = PsgcCode::candidates($cityPsgc);
                if ($cityCandidates === []) {
                    return null;
                }
                $base->whereIn('address_city_municipality_psgc', $cityCandidates);
            }

            $res = (clone $base)
                ->orderByRaw("(CASE WHEN COALESCE(TRIM(address_label), '') != '' THEN 0 ELSE 1 END) ASC")
                ->orderBy('id')
                ->first($columns);

            if ($res !== null) {
                return $res;
            }
        }

        return null;
    }

    private function normalizeLabelSuffixForLocationStats(string $addressLabel, mixed $streetRaw, mixed $barangayRaw): string
    {
        $s = trim($addressLabel);
        $street = is_string($streetRaw) ? trim($streetRaw) : '';
        $barangay = is_string($barangayRaw) ? trim($barangayRaw) : '';
        $s = $this->stripKnownPrefixFromLabel($s, $street);
        $s = $this->stripKnownPrefixFromLabel($s, $barangay);

        return $s;
    }

    /**
     * Remove a leading "Segment," when it matches street or barangay text saved on the resort profile.
     */
    private function stripKnownPrefixFromLabel(string $label, string $prefix): string
    {
        if ($prefix === '' || $label === '') {
            return $label;
        }

        $len = strlen($prefix);
        if ($len > 0 && strncasecmp($label, $prefix, $len) === 0) {
            $rest = trim(substr($label, $len));
            if (str_starts_with($rest, ',')) {
                $rest = trim(substr($rest, 1));
            }

            return $rest !== '' ? $rest : $label;
        }

        return $label;
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

        foreach (PsgcCode::candidates($locCode) as $try) {
            $city = PsgcCityMunicipality::query()->where('code', $try)->first();
            if ($city !== null) {
                $pname = $this->resolveProvinceDisplayName((string) $city->province_code);

                return $this->cityProvinceDisplayCache[$key] = [
                    'city_name' => (string) $city->name,
                    'province_name' => $pname,
                ];
            }
        }

        foreach (PsgcCode::candidates($locCode) as $try) {
            $br = PsgcBarangay::query()->where('code', $try)->first();
            if ($br !== null) {
                $city = null;
                foreach (PsgcCode::candidates((string) $br->city_municipality_code) as $cityTry) {
                    $city = PsgcCityMunicipality::query()->where('code', $cityTry)->first();
                    if ($city !== null) {
                        break;
                    }
                }
                if ($city !== null) {
                    $pname = $this->resolveProvinceDisplayName((string) $city->province_code);

                    return $this->cityProvinceDisplayCache[$key] = [
                        'city_name' => (string) $city->name,
                        'province_name' => $pname,
                    ];
                }
            }
        }

        $res = $this->firstRepresentativeResort($provinceFromResort, $locCode, 'both');
        $labels = $this->inferCityProvinceLabelsFromResort($res);
        if ($labels !== null && ($labels['city'] !== '' || $labels['province'] !== '')) {
            $cityName = $labels['city'];
            if ($cityName === '' && $this->matchesHintCity($locCode)) {
                $cityName = is_string($this->hintCityLabel) ? trim($this->hintCityLabel) : '';
            }
            $provName = $labels['province'] !== ''
                ? $labels['province']
                : $this->resolveProvinceDisplayName($provinceFromResort);
            if ($this->matchesHintProvince($provinceFromResort)) {
                $h = is_string($this->hintProvinceLabel) ? trim($this->hintProvinceLabel) : '';
                if ($h !== '') {
                    $provName = $h;
                }
            }

            return $this->cityProvinceDisplayCache[$key] = [
                'city_name' => $cityName,
                'province_name' => $provName,
            ];
        }

        $pname = $this->resolveProvinceDisplayName($provinceFromResort);
        $cname = '';
        if ($this->matchesHintCity($locCode)) {
            $cname = is_string($this->hintCityLabel) ? trim($this->hintCityLabel) : '';
        }
        if ($this->matchesHintProvince($provinceFromResort)) {
            $h = is_string($this->hintProvinceLabel) ? trim($this->hintProvinceLabel) : '';
            if ($h !== '') {
                $pname = $h;
            }
        }

        return $this->cityProvinceDisplayCache[$key] = [
            'city_name' => $cname,
            'province_name' => $pname,
        ];
    }

    /**
     * @return array{city: string, province: string}
     */
    private function trimDisplayFragment(string $segment): string
    {
        return $this->sanitizeLocationLabelPart($segment);
    }

    /**
     * @return array{city: string, province: string}
     */
    private function parseCityProvinceFromAddressLabel(string $addressLabel, string $streetLine, string $barangayName): array
    {
        $parts = array_values(array_filter(array_map(
            fn (string $p): string => $this->trimDisplayFragment($p),
            explode(',', $addressLabel),
        ), static fn (string $p): bool => $p !== ''));
        $street = trim($streetLine);
        $barangay = trim($barangayName);
        $parts = $this->collapseMatchingLeadingSegments($parts, $street, $barangay);

        $guard = 0;
        while (count($parts) > 2 && $this->segmentLooksLikeDetailedStreetSegment($parts[0]) && $guard++ < 8) {
            array_shift($parts);
            $parts = array_values($parts);
        }

        $n = count($parts);
        if ($n === 0) {
            return ['city' => '', 'province' => ''];
        }
        if ($n === 1) {
            if ($this->segmentLooksLikeDetailedStreetSegment($parts[0])) {
                return ['city' => '', 'province' => ''];
            }

            return ['city' => $parts[0], 'province' => ''];
        }
        if ($n === 2) {
            if ($this->segmentLooksLikeDetailedStreetSegment($parts[0])) {
                return ['city' => $parts[1], 'province' => ''];
            }

            return ['city' => $parts[0], 'province' => $parts[1]];
        }

        return ['city' => $parts[$n - 2], 'province' => $parts[$n - 1]];
    }

    /**
     * @param  list<string>  $parts
     * @return list<string>
     */
    private function collapseMatchingLeadingSegments(array $parts, string $street, string $barangay): array
    {
        $parts = array_values($parts);
        for ($i = 0; $i < 6 && count($parts) >= 1; $i++) {
            $first = $parts[0] ?? '';
            if ($first === '') {
                break;
            }
            if ($street !== '' && strcasecmp($first, $street) === 0) {
                array_shift($parts);
                $parts = array_values($parts);

                continue;
            }
            if ($barangay !== '' && strcasecmp($first, $barangay) === 0) {
                array_shift($parts);
                $parts = array_values($parts);

                continue;
            }
            break;
        }

        return array_values($parts);
    }

    private function segmentLooksLikeDetailedStreetSegment(string $segment): bool
    {
        return (bool) preg_match(
            '/\b(street|st\.|road|rd\.|avenue|ave|boulevard|blvd|highway|hwy|blk|block|lot|phase|subdivision|subd\.|purok|sitio|bldg|building|unit|floor|house|#\d)\b/i',
            $segment,
        );
    }
}
