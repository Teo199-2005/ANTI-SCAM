<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Apply province / city PSGC filters on queries that expose resort address columns.
 */
final class ResortLocationQuery
{
    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    public static function applyToResortColumns(
        Builder $query,
        ?string $provincePsgc,
        ?string $cityPsgc,
        string $provinceColumn = 'address_province_psgc',
        string $cityColumn = 'address_city_municipality_psgc',
    ): void {
        $provincePsgc = self::normalize($provincePsgc);
        $cityPsgc = self::normalize($cityPsgc);

        if ($provincePsgc !== null) {
            $query->where($provinceColumn, $provincePsgc);
        }

        if ($cityPsgc !== null) {
            $query->where($cityColumn, $cityPsgc);
        }
    }

    /**
     * Filter rows that have a related resort (e.g. reservations).
     *
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    public static function whereHasResortLocation(
        Builder $query,
        ?string $provincePsgc,
        ?string $cityPsgc,
        string $resortRelation = 'resort',
    ): void {
        $provincePsgc = self::normalize($provincePsgc);
        $cityPsgc = self::normalize($cityPsgc);

        if ($provincePsgc === null && $cityPsgc === null) {
            return;
        }

        $query->whereHas($resortRelation, function (Builder $resort) use ($provincePsgc, $cityPsgc): void {
            self::applyToResortColumns($resort, $provincePsgc, $cityPsgc);
        });
    }

    /**
     * Filter users by resort location on their tenant (for resort_owner filtering).
     *
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    public static function whereUserTenantHasResortLocation(
        Builder $query,
        ?string $provincePsgc,
        ?string $cityPsgc,
    ): void {
        $provincePsgc = self::normalize($provincePsgc);
        $cityPsgc = self::normalize($cityPsgc);

        if ($provincePsgc === null && $cityPsgc === null) {
            return;
        }

        $query->whereHas('tenant.resorts', function (Builder $resort) use ($provincePsgc, $cityPsgc): void {
            self::applyToResortColumns($resort, $provincePsgc, $cityPsgc);
        });
    }

    /**
     * Filter marketers by mailing address PSGC (not resort location).
     *
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    public static function applyToUserMailingColumns(
        Builder $query,
        ?string $provincePsgc,
        ?string $cityPsgc,
    ): void {
        $provincePsgc = self::normalize($provincePsgc);
        $cityPsgc = self::normalize($cityPsgc);

        if ($provincePsgc !== null) {
            $query->where('mailing_province_psgc', $provincePsgc);
        }

        if ($cityPsgc !== null) {
            $query->where('mailing_city_municipality_psgc', $cityPsgc);
        }
    }

    public static function normalize(?string $code): ?string
    {
        if ($code === null) {
            return null;
        }

        $trimmed = trim($code);

        return $trimmed !== '' ? $trimmed : null;
    }

    /**
     * @return array{province_psgc: ?string, city_municipality_psgc: ?string}
     */
    public static function fromRequest(\Illuminate\Http\Request $request): array
    {
        return [
            'province_psgc' => self::normalize($request->query('province_psgc') ?: $request->query('province_code')),
            'city_municipality_psgc' => self::normalize($request->query('city_municipality_psgc') ?: $request->query('city_code')),
        ];
    }
}
