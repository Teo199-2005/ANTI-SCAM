<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

final class GooglePendingSignupService
{
    private const TTL_MINUTES = 20;

    /**
     * @return non-empty-string Opaque token for the SPA (not the Google ID).
     */
    public function issue(string $googleId, string $email, string $name): string
    {
        $token = Str::random(48);
        Cache::put($this->cacheKey($token), [
            'google_id' => $googleId,
            'email' => mb_strtolower(trim($email)),
            'name' => trim($name),
        ], now()->addMinutes(self::TTL_MINUTES));

        return $token;
    }

    /**
     * @return array{google_id: string, email: string, name: string}|null
     */
    public function peek(string $token): ?array
    {
        $data = Cache::get($this->cacheKey($token));

        return is_array($data) ? $this->normalize($data) : null;
    }

    /**
     * @return array{google_id: string, email: string, name: string}|null
     */
    public function consume(string $token): ?array
    {
        $key = $this->cacheKey($token);
        $data = Cache::get($key);
        if (! is_array($data)) {
            return null;
        }
        Cache::forget($key);

        return $this->normalize($data);
    }

    private function cacheKey(string $token): string
    {
        return 'google_pending_signup:'.hash('sha256', $token);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{google_id: string, email: string, name: string}|null
     */
    private function normalize(array $data): ?array
    {
        $googleId = (string) ($data['google_id'] ?? '');
        $email = (string) ($data['email'] ?? '');
        $name = (string) ($data['name'] ?? '');
        if ($googleId === '' || $email === '' || $name === '') {
            return null;
        }

        return [
            'google_id' => $googleId,
            'email' => $email,
            'name' => $name,
        ];
    }
}
