<?php

namespace App\Services;

use App\Models\PsgcBarangay;
use App\Models\PsgcCityMunicipality;
use App\Models\PsgcProvince;
use App\Models\Resort;
use App\Models\User;
use App\Support\PsgcCode;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class PhilippineLocationService
{
    public function provinces(): Collection
    {
        return PsgcProvince::query()->orderBy('name')->get(['code', 'name']);
    }

    public function citiesForProvince(string $provinceCode): Collection
    {
        $prov = $this->findProvinceRow($provinceCode);
        if ($prov !== null) {
            return PsgcCityMunicipality::query()
                ->where('province_code', $prov->code)
                ->orderBy('name')
                ->get(['code', 'province_code', 'name']);
        }

        $candidates = PsgcCode::candidates($provinceCode);
        if ($candidates === []) {
            return collect();
        }

        return PsgcCityMunicipality::query()
            ->whereIn('province_code', $candidates)
            ->orderBy('name')
            ->get(['code', 'province_code', 'name']);
    }

    /**
     * @return LengthAwarePaginator<int, PsgcBarangay>
     */
    public function barangaysForCity(string $cityCode, int $perPage = 300): LengthAwarePaginator
    {
        $candidates = PsgcCode::candidates($cityCode);
        if ($candidates === []) {
            return PsgcBarangay::query()->whereRaw('1 = 0')->paginate($perPage, ['code', 'city_municipality_code', 'name']);
        }

        return PsgcBarangay::query()
            ->whereIn('city_municipality_code', $candidates)
            ->orderBy('name')
            ->paginate($perPage, ['code', 'city_municipality_code', 'name']);
    }

    /**
     * Province + city + barangay PSGC codes only (legacy).
     */
    public function isCompleteTriple(?string $province, ?string $city, ?string $barangay): bool
    {
        return filled($province) && filled($city) && filled($barangay);
    }

    /**
     * Full postal address: province + city + either barangay label or barangay PSGC code.
     */
    public function isCompleteLocation(
        ?string $provinceCode,
        ?string $cityCode,
        ?string $barangayName,
        ?string $barangayPsgc,
    ): bool {
        if (! filled($provinceCode) || ! filled($cityCode)) {
            return false;
        }

        return filled($barangayName) || filled($barangayPsgc);
    }

    public function isValidProvinceCityPair(?string $provinceCode, ?string $cityCode): bool
    {
        if (! filled($provinceCode) || ! filled($cityCode)) {
            return false;
        }

        if (! Schema::hasTable('psgc_provinces') || ! Schema::hasTable('psgc_cities_municipalities')) {
            return $this->looksLikePsgcCode($provinceCode) && $this->looksLikePsgcCode($cityCode);
        }

        if (! PsgcProvince::query()->exists()) {
            return $this->looksLikePsgcCode($provinceCode) && $this->looksLikePsgcCode($cityCode);
        }

        $city = $this->findCityRow($cityCode);
        if ($city === null) {
            // Partial PSGC seeds (for demos/tests) should not block real picker codes.
            return $this->looksLikePsgcCode($provinceCode) && $this->looksLikePsgcCode($cityCode);
        }

        return $this->provinceSelectionMatchesCityProvince($provinceCode, $city);
    }

    /**
     * True when the SPA "province" code matches the city row's PSA province, or when the province
     * slot repeats the city/municipality code (common for NCR HUCs such as Quezon City in flat pickers).
     */
    private function provinceSelectionMatchesCityProvince(?string $provinceCode, PsgcCityMunicipality $city): bool
    {
        if (! filled($provinceCode)) {
            return false;
        }

        if (PsgcCode::same($city->province_code, $provinceCode)) {
            return true;
        }

        if (PsgcCode::same($city->code, $provinceCode)) {
            return true;
        }

        $provinceAsCity = $this->findCityRow($provinceCode);

        return $provinceAsCity !== null && PsgcCode::same($provinceAsCity->code, $city->code);
    }

    /**
     * Return the PSA province code string stored on {@see PsgcProvince} for this pair, or the city's
     * {@see PsgcCityMunicipality::$province_code} when the SPA "province" value was a city code / alias.
     */
    public function canonicalProvinceCodeForMailing(?string $provinceCode, ?string $cityCode): ?string
    {
        if (! filled($provinceCode) || ! filled($cityCode)) {
            return $provinceCode;
        }

        $city = $this->findCityRow($cityCode);
        if ($city === null || ! $this->provinceSelectionMatchesCityProvince($provinceCode, $city)) {
            return $provinceCode;
        }

        $prov = $this->findProvinceRow($provinceCode);

        return $prov !== null ? (string) $prov->code : (string) $city->province_code;
    }

    private function looksLikePsgcCode(string $code): bool
    {
        return (bool) preg_match('/^\d{7,12}$/', $code);
    }

    public function isValidHierarchy(?string $provinceCode, ?string $cityCode, ?string $barangayCode): bool
    {
        if (! $this->isCompleteTriple($provinceCode, $cityCode, $barangayCode)) {
            return false;
        }

        $city = $this->findCityRow($cityCode);
        if ($city === null || ! $this->provinceSelectionMatchesCityProvince($provinceCode, $city)) {
            return false;
        }

        $br = $this->findBarangayRow($barangayCode);

        return $br !== null && PsgcCode::same($br->city_municipality_code, $city->code);
    }

    private function findProvinceRow(?string $provinceCode): ?PsgcProvince
    {
        if (! filled($provinceCode)) {
            return null;
        }

        foreach (PsgcCode::candidates($provinceCode) as $try) {
            $p = PsgcProvince::query()->where('code', $try)->first();
            if ($p !== null) {
                return $p;
            }
        }

        return null;
    }

    private function findCityRow(?string $cityCode): ?PsgcCityMunicipality
    {
        if (! filled($cityCode)) {
            return null;
        }

        foreach (PsgcCode::candidates($cityCode) as $try) {
            $c = PsgcCityMunicipality::query()->where('code', $try)->first();
            if ($c !== null) {
                return $c;
            }
        }

        return null;
    }

    private function findBarangayRow(?string $barangayCode): ?PsgcBarangay
    {
        if (! filled($barangayCode)) {
            return null;
        }

        foreach (PsgcCode::candidates($barangayCode) as $try) {
            $b = PsgcBarangay::query()->where('code', $try)->first();
            if ($b !== null) {
                return $b;
            }
        }

        return null;
    }

    /**
     * Human-readable "City, Province" from stored PSGC codes only (no street, barangay, or address_label).
     * Used for admin aggregates so buckets match what owners selected in the location pickers.
     */
    public function administrativeAreaLabelFromCodes(?string $provinceCode, ?string $cityCode): ?string
    {
        if (! filled($provinceCode) || ! filled($cityCode)) {
            return null;
        }

        $city = $this->findCityRow($cityCode);
        if ($city === null) {
            $br = $this->findBarangayRow($cityCode);
            if ($br !== null) {
                $city = $this->findCityRow((string) $br->city_municipality_code);
            }
        }

        if ($city === null) {
            return null;
        }

        if (! $this->provinceSelectionMatchesCityProvince($provinceCode, $city)) {
            return null;
        }

        $prov = $this->findProvinceRow($provinceCode) ?? $this->findProvinceRow($city->province_code);
        $cityName = trim((string) $city->name);
        $cityName = preg_replace('/\s+/u', ' ', $cityName) ?? $cityName;
        if ($prov === null) {
            return $cityName !== '' ? $cityName : null;
        }

        $provName = trim((string) $prov->name);
        $provName = preg_replace('/\s+/u', ' ', $provName) ?? $provName;
        if ($cityName === '') {
            return $provName !== '' ? $provName : null;
        }
        if ($provName !== '' && strcasecmp($cityName, $provName) === 0) {
            return $cityName;
        }

        return $provName !== '' ? "{$cityName}, {$provName}" : $cityName;
    }

    /**
     * Comma-separated line: Barangay, City/Municipality, Province.
     *
     * @param  ?string  $barangayName  Free-text barangay (preferred when set)
     * @param  ?string  $barangayPsgc  Legacy PSGC barangay code
     */
    public function formatAddressLine(
        ?string $provinceCode,
        ?string $cityCode,
        ?string $barangayName,
        ?string $barangayPsgc,
    ): ?string {
        if (! $this->isCompleteLocation($provinceCode, $cityCode, $barangayName, $barangayPsgc)) {
            return null;
        }

        $city = $this->findCityRow($cityCode);
        if ($city === null) {
            if (filled($barangayName) && $this->isValidProvinceCityPair($provinceCode, $cityCode)) {
                return trim((string) $barangayName);
            }

            return null;
        }

        if (! $this->provinceSelectionMatchesCityProvince($provinceCode, $city)) {
            if (filled($barangayName) && $this->isValidProvinceCityPair($provinceCode, $cityCode)) {
                return trim((string) $barangayName);
            }

            return null;
        }

        $prov = $this->findProvinceRow($provinceCode) ?? $this->findProvinceRow($city->province_code);
        if ($prov !== null) {
            if (filled($barangayName)) {
                return trim((string) $barangayName).', '.$city->name.', '.$prov->name;
            }

            $br = $this->findBarangayRow((string) $barangayPsgc);
            if ($br === null) {
                return null;
            }

            return $br->name.', '.$city->name.', '.$prov->name;
        }

        // SPA pickers (e.g. @jobuntux/psgc) may use codes that are not present in this server's PSGC tables
        // or differ slightly from seeded rows. If the pair still validates, accept free-text barangay so
        // landing readiness and address_label sync are not blocked forever.
        if (filled($barangayName) && $this->isValidProvinceCityPair($provinceCode, $cityCode)) {
            return trim((string) $barangayName);
        }

        return null;
    }

    /**
     * @deprecated Use formatAddressLine with barangay name + code parameters
     */
    public function formatFromCodes(?string $provinceCode, ?string $cityCode, ?string $barangayCode): ?string
    {
        return $this->formatAddressLine($provinceCode, $cityCode, null, $barangayCode);
    }

    public function resortDisplayLine(Resort $resort): ?string
    {
        $fromParts = $this->formatAddressLine(
            $resort->address_province_psgc,
            $resort->address_city_municipality_psgc,
            $resort->address_barangay_name ?? null,
            $resort->address_barangay_psgc,
        );
        if ($fromParts !== null && $this->isPlaceholderDemoLocationLine($fromParts)) {
            $fromParts = null;
        }
        if ($fromParts !== null) {
            return $this->prefixResortStreetLine($resort, $fromParts);
        }

        $label = $resort->address_label ?? null;
        $label = is_string($label) ? trim($label) : '';
        if ($label !== '' && ! $this->isPlaceholderDemoLocationLine($label)) {
            return $this->prefixResortStreetLine($resort, $label);
        }

        $streetOnly = $this->trimmedStreetLine($resort);

        return $streetOnly !== '' ? $streetOnly : null;
    }

    private function trimmedStreetLine(Resort $resort): string
    {
        $street = $resort->address_street_line ?? null;
        $street = is_string($street) ? trim($street) : '';

        return $street;
    }

    private function prefixResortStreetLine(Resort $resort, string $line): string
    {
        $street = $this->trimmedStreetLine($resort);

        return $street !== '' ? "{$street}, {$line}" : $line;
    }

    /**
     * Legacy/example PSGC seeds used names like "Demo Province" — hide them so UI can fall back
     * to a proper {@see Resort::$address_label} or omit the line until the owner fixes location.
     */
    private function isPlaceholderDemoLocationLine(string $line): bool
    {
        $lower = mb_strtolower($line);

        return str_contains($lower, 'demo province')
            || str_contains($lower, 'demo city')
            || str_contains($lower, 'alt barangay');
    }

    public function resortMapQueryString(Resort $resort): ?string
    {
        $line = $this->resortDisplayLine($resort);
        if ($line === null) {
            return null;
        }

        return $line.', Philippines';
    }

    public function resortHasUsableLocation(Resort $resort): bool
    {
        return $this->resortDisplayLine($resort) !== null;
    }

    /**
     * When a valid location is saved, overwrite the denormalized label for search and legacy display.
     */
    public function syncResortAddressLabel(Resort $resort): void
    {
        $formatted = $this->formatAddressLine(
            $resort->address_province_psgc,
            $resort->address_city_municipality_psgc,
            $resort->address_barangay_name ?? null,
            $resort->address_barangay_psgc,
        );
        if ($formatted !== null && ! $this->isPlaceholderDemoLocationLine($formatted)) {
            $resort->forceFill(['address_label' => $formatted])->saveQuietly();
        }
    }

    public function syncUserMailingLabel(User $user): void
    {
        $formatted = $this->formatAddressLine(
            $user->mailing_province_psgc,
            $user->mailing_city_municipality_psgc,
            $user->mailing_barangay_name ?? null,
            $user->mailing_barangay_psgc,
        );
        if ($formatted !== null) {
            $user->forceFill(['mailing_location_label' => $formatted])->saveQuietly();
        }
    }

    public function userMailingDisplayLine(User $user): ?string
    {
        $fromParts = $this->formatAddressLine(
            $user->mailing_province_psgc,
            $user->mailing_city_municipality_psgc,
            $user->mailing_barangay_name ?? null,
            $user->mailing_barangay_psgc,
        );
        if ($fromParts !== null) {
            return $fromParts;
        }

        $label = $user->mailing_location_label ?? null;

        return is_string($label) && trim($label) !== '' ? trim($label) : null;
    }

    /**
     * Validates Philippine location fields on resorts / generic payloads.
     *
     * @param  array<int, string>  $attributeKeys  province, city, barangay_name, barangay_psgc
     *
     * @throws ValidationException
     */
    public function assertValidPhilippineLocationOrEmpty(
        ?string $provinceCode,
        ?string $cityCode,
        ?string $barangayName,
        ?string $barangayPsgc,
        array $attributeKeys = ['address_province_psgc', 'address_city_municipality_psgc', 'address_barangay_name', 'address_barangay_psgc'],
    ): void {
        $barangayName = filled($barangayName) ? trim((string) $barangayName) : null;
        $barangayPsgc = filled($barangayPsgc) ? trim((string) $barangayPsgc) : null;

        $any = filled($provinceCode) || filled($cityCode) || filled($barangayName) || filled($barangayPsgc);
        if (! $any) {
            return;
        }

        if (! filled($provinceCode) || ! filled($cityCode)) {
            throw ValidationException::withMessages([
                $attributeKeys[0] => ['Select province and city or municipality together.'],
            ]);
        }

        if (! filled($barangayName) && ! filled($barangayPsgc)) {
            throw ValidationException::withMessages([
                $attributeKeys[2] => ['Enter barangay.'],
            ]);
        }

        if (! $this->isValidProvinceCityPair($provinceCode, $cityCode)) {
            throw ValidationException::withMessages([
                $attributeKeys[1] => ['The selected city or municipality does not belong to that province.'],
            ]);
        }

        if (filled($barangayPsgc) && ! $this->isValidHierarchy($provinceCode, $cityCode, $barangayPsgc)) {
            throw ValidationException::withMessages([
                $attributeKeys[3] => ['The selected Philippine location is invalid.'],
            ]);
        }
    }

    /**
     * @deprecated Use assertValidPhilippineLocationOrEmpty with barangay name + code
     *
     * @param  array{0: string, 1: string, 2: string}  $attributeKeys
     */
    public function assertValidTripleOrEmpty(
        ?string $provinceCode,
        ?string $cityCode,
        ?string $barangayCode,
        array $attributeKeys = ['address_province_psgc', 'address_city_municipality_psgc', 'address_barangay_psgc'],
    ): void {
        $this->assertValidPhilippineLocationOrEmpty(
            $provinceCode,
            $cityCode,
            null,
            $barangayCode,
            [$attributeKeys[0], $attributeKeys[1], $attributeKeys[2], $attributeKeys[2]],
        );
    }
}
