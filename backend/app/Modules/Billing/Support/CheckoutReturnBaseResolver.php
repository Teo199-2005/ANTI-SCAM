<?php

declare(strict_types=1);

namespace App\Modules\Billing\Support;

/**
 * Resolves the SPA origin used in Xendit success/failure redirects.
 * Defaults to FRONTEND_URL; the client may send checkout_return_base (browser origin)
 * so redirects land on the same host as the auth cookie (e.g. tenant.localhost vs 127.0.0.1).
 */
final class CheckoutReturnBaseResolver
{
    public function resolve(?string $requested): string
    {
        $default = rtrim((string) config('app.frontend_url', 'http://127.0.0.1:3000'), '/');
        if ($requested === null) {
            return $default;
        }
        $trimmed = trim($requested);
        if ($trimmed === '' || ! preg_match('#^https?://#i', $trimmed)) {
            return $default;
        }
        $parts = parse_url($trimmed);
        if (! is_array($parts) || empty($parts['host'])) {
            return $default;
        }
        if (! empty($parts['user']) || ! empty($parts['pass'])) {
            return $default;
        }
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if (! in_array($scheme, ['http', 'https'], true)) {
            return $default;
        }
        $host = strtolower((string) $parts['host']);
        if (! $this->isAllowedCheckoutReturnHost($host)) {
            return $default;
        }
        $port = isset($parts['port']) ? ':'.(int) $parts['port'] : '';

        return rtrim("{$scheme}://{$host}{$port}", '/');
    }

    private function isAllowedCheckoutReturnHost(string $host): bool
    {
        if ($host === 'localhost' || $host === '127.0.0.1') {
            return true;
        }
        if (str_ends_with($host, '.localhost')) {
            return true;
        }
        $frontendUrl = (string) config('app.frontend_url', '');
        $frontendHost = parse_url($frontendUrl, PHP_URL_HOST);
        if (is_string($frontendHost) && $frontendHost !== '') {
            $frontendHost = strtolower($frontendHost);
            if (strcasecmp($host, $frontendHost) === 0) {
                return true;
            }
            if (str_ends_with($host, '.'.$frontendHost)) {
                return true;
            }
        }
        $allow = config('app.checkout_return_hosts', []);
        if (is_array($allow)) {
            foreach ($allow as $h) {
                if (is_string($h) && strcasecmp($host, $h) === 0) {
                    return true;
                }
            }
        }

        return false;
    }
}
