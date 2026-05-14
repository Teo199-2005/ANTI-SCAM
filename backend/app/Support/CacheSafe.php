<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Cache::remember wrapper that still runs the callback when the cache store throws
 * (misconfigured Redis, missing cache table, etc.) so dashboards keep working.
 */
final class CacheSafe
{
    /**
     * @template T
     * @param  callable(): T  $callback
     * @return T
     */
    public static function remember(string $key, \DateTimeInterface|\DateInterval|int|null $ttl, callable $callback): mixed
    {
        try {
            return Cache::remember($key, $ttl, $callback);
        } catch (\Throwable) {
            return $callback();
        }
    }
}
