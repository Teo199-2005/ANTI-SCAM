<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

/**
 * Carries return path + SPA origin through Google OAuth (session often lost when Next proxies to loopback Laravel).
 */
final class GoogleOAuthState
{
    /**
     * @return non-empty-string
     */
    public static function encode(?string $returnTo, string $frontendBase): string
    {
        $payload = json_encode([
            'return_to' => $returnTo,
            'frontend' => rtrim($frontendBase, '/'),
            'nonce' => Str::random(16),
        ], JSON_THROW_ON_ERROR);

        return Crypt::encryptString($payload);
    }

    /**
     * @return array{return_to: ?string, frontend: ?string}|null
     */
    public static function decode(?string $state): ?array
    {
        if (! is_string($state) || trim($state) === '') {
            return null;
        }

        try {
            $raw = json_decode(Crypt::decryptString($state), true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }

        if (! is_array($raw)) {
            return null;
        }

        $returnTo = isset($raw['return_to']) && is_string($raw['return_to']) ? $raw['return_to'] : null;
        $frontend = isset($raw['frontend']) && is_string($raw['frontend']) ? rtrim($raw['frontend'], '/') : null;

        return [
            'return_to' => $returnTo,
            'frontend' => $frontend !== '' ? $frontend : null,
        ];
    }
}
