<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Resolves the SPA origin for OAuth and redirects when FRONTEND_URL is still a dev default on production.
 */
final class FrontendOriginResolver
{
    public function resolve(Request $request): string
    {
        $configured = rtrim((string) config('app.frontend_url', 'http://127.0.0.1:3000'), '/');

        $fromRequest = $this->fromRequestHeaders($request);
        if ($fromRequest !== null && $this->isAllowedPublicOrigin($fromRequest)) {
            return $this->preferOverLocalDevDefault($fromRequest, $configured);
        }

        $origin = $request->headers->get('Origin');
        if (is_string($origin) && $origin !== '') {
            $origin = rtrim($origin, '/');
            if ($this->isAllowedPublicOrigin($origin)) {
                return $this->preferOverLocalDevDefault($origin, $configured);
            }
        }

        $referer = $request->headers->get('Referer');
        if (is_string($referer) && $referer !== '') {
            $parts = parse_url($referer);
            if (is_array($parts) && ! empty($parts['host'])) {
                $scheme = strtolower((string) ($parts['scheme'] ?? 'https'));
                if (! in_array($scheme, ['http', 'https'], true)) {
                    $scheme = 'https';
                }
                $port = isset($parts['port']) ? ':'.(int) $parts['port'] : '';
                $candidate = rtrim("{$scheme}://{$parts['host']}{$port}", '/');
                if ($this->isAllowedPublicOrigin($candidate)) {
                    return $this->preferOverLocalDevDefault($candidate, $configured);
                }
            }
        }

        return $configured;
    }

    private function fromRequestHeaders(Request $request): ?string
    {
        $fwdHost = $request->headers->get('X-Forwarded-Host');
        if (is_string($fwdHost) && trim($fwdHost) !== '') {
            $host = trim(explode(',', $fwdHost)[0]);
            $proto = $request->headers->get('X-Forwarded-Proto');
            if (! is_string($proto) || trim($proto) === '') {
                $proto = $request->isSecure() ? 'https' : 'http';
            } else {
                $proto = strtolower(trim(explode(',', $proto)[0]));
            }
            if (! in_array($proto, ['http', 'https'], true)) {
                $proto = 'https';
            }

            return rtrim("{$proto}://{$host}", '/');
        }

        $base = rtrim($request->getSchemeAndHttpHost(), '/');

        return $base !== '' ? $base : null;
    }

    private function preferOverLocalDevDefault(string $candidate, string $configured): string
    {
        $candidateHost = parse_url($candidate, PHP_URL_HOST);
        $configuredHost = parse_url($configured, PHP_URL_HOST);
        if (! is_string($candidateHost) || $candidateHost === '') {
            return $configured;
        }

        $localHosts = ['localhost', '127.0.0.1', '[::1]'];
        $configuredIsLocal = is_string($configuredHost) && in_array($configuredHost, $localHosts, true);
        $candidateIsLocal = in_array($candidateHost, $localHosts, true);

        if ($configuredIsLocal && ! $candidateIsLocal) {
            return $candidate;
        }

        if (is_string($configuredHost) && strcasecmp($candidateHost, $configuredHost) === 0) {
            return $candidate;
        }

        if ($configuredIsLocal && $this->isAllowedPublicOrigin($candidate)) {
            return $candidate;
        }

        return $configured;
    }

    private function isAllowedPublicOrigin(string $origin): bool
    {
        if (! preg_match('#^https?://#i', $origin)) {
            return false;
        }
        $host = parse_url($origin, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return false;
        }
        $host = strtolower($host);

        if (in_array($host, ['localhost', '127.0.0.1', '[::1]'], true)) {
            return true;
        }
        if (str_ends_with($host, '.localhost')) {
            return true;
        }

        foreach ($this->configuredAllowedHosts() as $allowed) {
            if (strcasecmp($host, $allowed) === 0) {
                return true;
            }
            if (str_ends_with($host, '.'.$allowed)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private function configuredAllowedHosts(): array
    {
        $hosts = [];
        foreach ([
            (string) config('app.frontend_url', ''),
            (string) config('app.url', ''),
        ] as $url) {
            $h = parse_url($url, PHP_URL_HOST);
            if (is_string($h) && $h !== '') {
                $hosts[] = strtolower($h);
            }
        }
        $extra = config('app.checkout_return_hosts', []);
        if (is_array($extra)) {
            foreach ($extra as $h) {
                if (is_string($h) && $h !== '') {
                    $hosts[] = strtolower($h);
                }
            }
        }

        return array_values(array_unique($hosts));
    }
}
