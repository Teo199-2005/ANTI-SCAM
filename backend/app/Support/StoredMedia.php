<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

final class StoredMedia
{
    /**
     * Disk name for user uploads: "public" or "s3" (R2).
     */
    public static function disk(): string
    {
        return match (config('media.disk')) {
            's3' => 's3',
            default => 'public',
        };
    }

    /**
     * Value stored in the database / returned in JSON for a stored object key.
     * public: /storage/{key}; s3: absolute URL from AWS_URL + key.
     */
    public static function publicUrlForPath(string $relativePath): string
    {
        if (self::disk() === 's3') {
            return Storage::disk('s3')->url($relativePath);
        }

        return '/storage/'.$relativePath;
    }

    /**
     * Remove a previously stored file given the DB value (legacy /storage/..., full APP_URL/storage/..., or R2 URL).
     */
    public static function deleteIfPresent(?string $stored): void
    {
        if (! is_string($stored) || $stored === '') {
            return;
        }

        if (str_starts_with($stored, '/storage/')) {
            Storage::disk('public')->delete(substr($stored, strlen('/storage/')));

            return;
        }

        $trimmed = trim($stored);
        if (! str_starts_with($trimmed, 'http://') && ! str_starts_with($trimmed, 'https://')) {
            return;
        }

        $parts = parse_url($trimmed);
        $path = is_string($parts['path'] ?? null) ? $parts['path'] : '';

        if ($path !== '' && str_starts_with($path, '/storage/')) {
            Storage::disk('public')->delete(substr($path, strlen('/storage/')));

            return;
        }

        $key = ltrim($path, '/');
        if ($key === '') {
            return;
        }

        $storedHost = isset($parts['host']) ? strtolower((string) $parts['host']) : '';
        $publicHost = self::s3PublicUrlHost();
        if ($publicHost !== '' && $storedHost === $publicHost) {
            Storage::disk('s3')->delete($key);
        }
    }

    private static function s3PublicUrlHost(): string
    {
        $base = rtrim((string) config('filesystems.disks.s3.url', ''), '/');
        if ($base === '') {
            return '';
        }

        $host = parse_url($base, PHP_URL_HOST);

        return is_string($host) ? strtolower($host) : '';
    }
}
