<?php

namespace App\Services;

use App\Models\PsgcBarangay;
use App\Models\PsgcCityMunicipality;
use App\Models\PsgcProvince;
use App\Models\Resort;
use App\Models\User;
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
        return PsgcCityMunicipality::query()
            ->where('province_code', $provinceCode)
            ->orderBy('name')
            ->get(['code', 'province_code', 'name']);
    }

    /**
     * @return LengthAwarePaginator<int, PsgcBarangay>
     */
    public function barangaysForCity(string $cityCode, int $perPage = 300): LengthAwarePaginator
    {
        return PsgcBarangay::query()
            ->where('city_municipality_code', $cityCode)
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

        $city = PsgcCityMunicipality::query()->where('code', $cityCode)->first();
        if ($city === null) {
            // Partial PSGC seeds (for demos/tests) should not block real picker codes.
            return $this->looksLikePsgcCode($provinceCode) && $this->looksLikePsgcCode($cityCode);
        }

        return $city->province_code === $provinceCode;
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

        $city = PsgcCityMunicipality::query()->where('code', $cityCode)->first();
        if ($city === null || $city->province_code !== $provinceCode) {
            return false;
        }

        $br = PsgcBarangay::query()->where('code', $barangayCode)->first();

        return $br !== null && $br->city_municipality_code === $cityCode;
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

        $city = PsgcCityMunicipality::query()->where('code', $cityCode)->first();
        $prov = PsgcProvince::query()->where('code', $provinceCode)->first();
        if ($city === null || $prov === null || $city->province_code !== $provinceCode) {
            return null;
        }

        if (filled($barangayName)) {
            return trim((string) $barangayName).', '.$city->name.', '.$prov->name;
        }

        $br = PsgcBarangay::query()->where('code', $barangayPsgc)->first();
        if ($br === null) {
            return null;
        }

        return $br->name.', '.$city->name.', '.$prov->name;
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
        if ($fromParts !== null) {
            return $fromParts;
        }

        $label = $resort->address_label ?? null;

        return is_string($label) && trim($label) !== '' ? trim($label) : null;
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
        if ($formatted !== null) {
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
