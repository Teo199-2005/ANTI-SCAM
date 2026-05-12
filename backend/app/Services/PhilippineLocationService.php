<?php

namespace App\Services;

use App\Models\PsgcBarangay;
use App\Models\PsgcCityMunicipality;
use App\Models\PsgcProvince;
use App\Models\Resort;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
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

    public function isCompleteTriple(?string $province, ?string $city, ?string $barangay): bool
    {
        return filled($province) && filled($city) && filled($barangay);
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
     */
    public function formatFromCodes(?string $provinceCode, ?string $cityCode, ?string $barangayCode): ?string
    {
        if (! $this->isCompleteTriple($provinceCode, $cityCode, $barangayCode)) {
            return null;
        }

        $br = PsgcBarangay::query()->where('code', $barangayCode)->first();
        $city = PsgcCityMunicipality::query()->where('code', $cityCode)->first();
        $prov = PsgcProvince::query()->where('code', $provinceCode)->first();
        if ($br === null || $city === null || $prov === null) {
            return null;
        }

        return $br->name.', '.$city->name.', '.$prov->name;
    }

    public function resortDisplayLine(Resort $resort): ?string
    {
        $fromCodes = $this->formatFromCodes(
            $resort->address_province_psgc,
            $resort->address_city_municipality_psgc,
            $resort->address_barangay_psgc,
        );
        if ($fromCodes !== null) {
            return $fromCodes;
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
     * When a valid triple is saved, overwrite the denormalized label for search and legacy display.
     */
    public function syncResortAddressLabel(Resort $resort): void
    {
        $formatted = $this->formatFromCodes(
            $resort->address_province_psgc,
            $resort->address_city_municipality_psgc,
            $resort->address_barangay_psgc,
        );
        if ($formatted !== null) {
            $resort->forceFill(['address_label' => $formatted])->saveQuietly();
        }
    }

    public function syncUserMailingLabel(\App\Models\User $user): void
    {
        $formatted = $this->formatFromCodes(
            $user->mailing_province_psgc,
            $user->mailing_city_municipality_psgc,
            $user->mailing_barangay_psgc,
        );
        if ($formatted !== null) {
            $user->forceFill(['mailing_location_label' => $formatted])->saveQuietly();
        }
    }

    public function userMailingDisplayLine(\App\Models\User $user): ?string
    {
        $fromCodes = $this->formatFromCodes(
            $user->mailing_province_psgc,
            $user->mailing_city_municipality_psgc,
            $user->mailing_barangay_psgc,
        );
        if ($fromCodes !== null) {
            return $fromCodes;
        }

        $label = $user->mailing_location_label ?? null;

        return is_string($label) && trim($label) !== '' ? trim($label) : null;
    }

    /**
     * @param  array{0: string, 1: string, 2: string}  $attributeKeys  province, city, barangay request keys
     *
     * @throws ValidationException
     */
    public function assertValidTripleOrEmpty(
        ?string $provinceCode,
        ?string $cityCode,
        ?string $barangayCode,
        array $attributeKeys = ['address_province_psgc', 'address_city_municipality_psgc', 'address_barangay_psgc'],
    ): void {
        $any = filled($provinceCode) || filled($cityCode) || filled($barangayCode);
        if (! $any) {
            return;
        }

        if (! $this->isCompleteTriple($provinceCode, $cityCode, $barangayCode)) {
            throw ValidationException::withMessages([
                $attributeKeys[0] => ['Select province, city or municipality, and barangay together.'],
            ]);
        }

        if (! $this->isValidHierarchy($provinceCode, $cityCode, $barangayCode)) {
            throw ValidationException::withMessages([
                $attributeKeys[2] => ['The selected Philippine location is invalid.'],
            ]);
        }
    }
}
