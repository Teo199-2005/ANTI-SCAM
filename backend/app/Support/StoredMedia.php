<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
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
     * Store an uploaded file on the configured media disk.
     * Falls back to the public disk when S3 fails on local dev.
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

    /**
     * Copy a file from the public disk to R2 after the HTTP response has been sent.
     *
     * @return array{disk: string, path: string}|null New disk metadata on success
     */
    public static function promotePublicPathToS3(string $relativePath): ?array
    {
        if (self::disk() !== 's3' || ! self::isValidStorageKey($relativePath)) {
            return null;
        }

        if (! Storage::disk('public')->exists($relativePath)) {
            return null;
        }

        try {
            $stream = Storage::disk('public')->readStream($relativePath);
            if ($stream === false) {
                throw new \RuntimeException('Could not read staged public file.');
            }

            Storage::disk('s3')->writeStream($relativePath, $stream, ['visibility' => 'public']);
            if (is_resource($stream)) {
                fclose($stream);
            }

            Storage::disk('public')->delete($relativePath);

            return ['disk' => 's3', 'path' => $relativePath];
        } catch (Throwable $e) {
            Log::warning('R2 promote failed; keeping public disk copy', [
                'path' => $relativePath,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
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
     * Stream a stored object for HTTP responses. For public R2 (AWS_URL set), redirect to the CDN URL
     * instead of proxying bytes through PHP — avoids slow S3 exists()/read() calls that exhaust FPM workers.
     */
    public static function httpResponseForStoredFile(string $disk, string $path): Response
    {
        if (! self::isValidStorageKey($path)) {
            abort(404, 'File not found.');
        }

        if ($disk === 's3') {
            $publicUrl = self::urlForStoredFile($disk, $path);
            if (str_starts_with($publicUrl, 'http://') || str_starts_with($publicUrl, 'https://')) {
                return redirect()->away($publicUrl);
            }
        }

        $storage = Storage::disk($disk);
        if (! $storage->exists($path)) {
            abort(404, 'File not found.');
        }

        return $storage->response($path);
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
