<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Ensures OAuth and redirects never send users to localhost when the app runs in production.
 */
final class ProductionFrontendUrl
{
    public static function sanitize(string $candidate, Request $request): string
    {
        $candidate = rtrim($candidate, '/');
        if ($candidate === '') {
            $candidate = rtrim((string) config('app.frontend_url', ''), '/');
        }

        if (! self::isLocalDevHost($candidate) || ! app()->isProduction()) {
            return $candidate;
        }

        $resolved = rtrim(app(FrontendOriginResolver::class)->resolve($request), '/');
        if ($resolved !== '' && ! self::isLocalDevHost($resolved)) {
            return $resolved;
        }

        $appUrl = rtrim((string) config('app.url', ''), '/');
        if ($appUrl !== '' && ! self::isLocalDevHost($appUrl)) {
            return $appUrl;
        }

        return $candidate;
    }

    public static function isLocalDevHost(string $url): bool
    {
        if (! preg_match('#^https?://#i', $url)) {
            return true;
        }

        $host = parse_url($url, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return true;
        }

        $host = strtolower($host);

        return in_array($host, ['localhost', '127.0.0.1', '[::1]'], true)
            || str_ends_with($host, '.localhost');
    }
}
