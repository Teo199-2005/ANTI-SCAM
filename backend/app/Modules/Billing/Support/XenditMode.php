<?php

namespace App\Modules\Billing\Support;

final class XenditMode
{
    public const LIVE = 'live';

    public const TEST = 'test';

    public const UNSET = 'unset';

    public static function fromSecretKey(?string $key): string
    {
        $key = trim((string) $key);
        if ($key === '') {
            return self::UNSET;
        }
        if (str_starts_with($key, 'xnd_production_')) {
            return self::LIVE;
        }
        if (str_starts_with($key, 'xnd_development_')) {
            return self::TEST;
        }

        return self::UNSET;
    }

    public static function current(): string
    {
        return self::fromSecretKey((string) config('services.xendit.secret_key'));
    }

    public static function isTestMode(): bool
    {
        return self::current() === self::TEST;
    }

    public static function isLiveMode(): bool
    {
        return self::current() === self::LIVE;
    }
}
