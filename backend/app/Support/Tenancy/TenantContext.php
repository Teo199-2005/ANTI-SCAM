<?php

namespace App\Support\Tenancy;

class TenantContext
{
    private static ?int $tenantId = null;

    public static function setTenantId(int $tenantId): void
    {
        self::$tenantId = $tenantId;
    }

    public static function tenantId(): ?int
    {
        return self::$tenantId;
    }

    public static function clear(): void
    {
        self::$tenantId = null;
    }
}
