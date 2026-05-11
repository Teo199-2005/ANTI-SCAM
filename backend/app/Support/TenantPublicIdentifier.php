<?php

namespace App\Support;

use App\Models\Tenant;
use Illuminate\Support\Str;

/**
 * Public landing URLs use /stay/{tenant.subdomain}. Values are derived from the resort name
 * so links look like /stay/teo instead of /stay/teofilo-harry-paet-w1scd1.
 */
final class TenantPublicIdentifier
{
    private const MAX_BASE_LEN = 48;

    public static function preferredSubdomainBaseFromResortName(string $resortName, ?string $fallbackTenantName = null): string
    {
        $fromResort = Str::slug($resortName);
        if ($fromResort !== '') {
            return self::truncateBase($fromResort);
        }
        $fromTenant = Str::slug((string) $fallbackTenantName);
        if ($fromTenant !== '') {
            return self::truncateBase($fromTenant);
        }

        return 'resort';
    }

    /**
     * @param  int|null  $exceptTenantId  When updating an existing tenant, allow keeping its own subdomain during checks.
     */
    public static function allocateUniqueSubdomain(string $preferredBase, ?int $exceptTenantId = null): string
    {
        $base = self::truncateBase(Str::slug($preferredBase)) ?: 'resort';

        if (! self::subdomainTaken($base, $exceptTenantId)) {
            return $base;
        }

        for ($i = 0; $i < 12; $i++) {
            $candidate = $base.'-'.Str::lower(Str::random(4));
            if (strlen($candidate) > 80) {
                $candidate = substr($candidate, 0, 80);
            }
            if (! self::subdomainTaken($candidate, $exceptTenantId)) {
                return $candidate;
            }
        }

        $fallback = $base.'-'.Str::lower(Str::random(8));

        return strlen($fallback) > 80 ? substr($fallback, 0, 80) : $fallback;
    }

    private static function truncateBase(string $slug): string
    {
        $slug = Str::slug($slug);
        if (strlen($slug) <= self::MAX_BASE_LEN) {
            return $slug;
        }

        return substr($slug, 0, self::MAX_BASE_LEN);
    }

    private static function subdomainTaken(string $subdomain, ?int $exceptTenantId): bool
    {
        $q = Tenant::withoutGlobalScopes()->where('subdomain', $subdomain);
        if ($exceptTenantId !== null) {
            $q->where('id', '!=', $exceptTenantId);
        }

        return $q->exists();
    }
}
