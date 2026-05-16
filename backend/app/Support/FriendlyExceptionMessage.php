<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;
use Throwable;

final class FriendlyExceptionMessage
{
    public static function forBulkDelete(Throwable $e): string
    {
        if ($e instanceof ValidationException) {
            $message = collect($e->errors())->flatten()->first();

            return is_string($message) && $message !== ''
                ? $message
                : 'This item could not be removed.';
        }

        $raw = trim($e->getMessage());

        if ($raw === '') {
            return 'This item could not be removed. Please try again.';
        }

        if (self::looksLikeSqlError($raw)) {
            return 'Something went wrong while removing this guest. Please try again.';
        }

        if (strlen($raw) > 140) {
            return 'This item could not be removed. Please try again.';
        }

        return $raw;
    }

    public static function looksLikeSqlError(string $message): bool
    {
        return (bool) preg_match(
            '/SQLSTATE|General error:\s*\d+|Connection:\s*mysql|syntax error|can\'t specify target table/i',
            $message
        );
    }
}
