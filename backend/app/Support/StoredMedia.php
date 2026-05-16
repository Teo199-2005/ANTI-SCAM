<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

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
     * Public URL for a stored object, respecting the disk recorded on the row (public vs s3).
     */
    public static function urlForStoredFile(string $disk, string $relativePath): string
    {
        $key = ltrim($relativePath, '/');
        if ($key === '' || $key === '0') {
            return '';
        }

        if ($disk === 'public') {
            return '/storage/'.$key;
        }

        return Storage::disk($disk)->url($key);
    }

    public static function isValidStorageKey(?string $relativePath): bool
    {
        $key = ltrim((string) $relativePath, '/');

        return $key !== '' && $key !== '0' && ! str_contains($key, '..');
    }

    /**
     * Store an uploaded file on the configured media disk, with a local-only public-disk fallback if S3 fails.
     *
     * @return array{disk: string, path: string}
     */
    public static function storeUploadedFile(UploadedFile $file, string $directory): array
    {
        $primary = self::disk();
        $lastError = null;

        try {
            $path = self::putOnDisk($file, $directory, $primary);
            if ($path !== null) {
                return ['disk' => $primary, 'path' => $path];
            }
        } catch (Throwable $e) {
            $lastError = $e;
            Log::warning('Primary media disk upload failed', [
                'disk' => $primary,
                'file' => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
            ]);
        }

        if ($primary === 's3' && app()->environment('local')) {
            try {
                $path = self::putOnDisk($file, $directory, 'public');
                if ($path !== null) {
                    Log::info('Stored upload on public disk after S3 failure (local dev)', [
                        'file' => $file->getClientOriginalName(),
                        'path' => $path,
                    ]);

                    return ['disk' => 'public', 'path' => $path];
                }
            } catch (Throwable $e) {
                $lastError = $e;
            }
        }

        $message = $lastError?->getMessage() ?? 'Unknown storage error';

        throw new \RuntimeException($message, 0, $lastError);
    }

    private static function putOnDisk(UploadedFile $file, string $directory, string $disk): ?string
    {
        $path = $file->store($directory, ['disk' => $disk]);
        if (! is_string($path) || ! self::isValidStorageKey($path)) {
            return null;
        }

        return $path;
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
