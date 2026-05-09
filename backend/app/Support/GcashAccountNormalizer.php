<?php

namespace App\Support;

class GcashAccountNormalizer
{
    /** @return array{ok: bool, normalized: ?string, error: ?string} */
    public static function normalizeMobile(string $raw): array
    {
        $digits = preg_replace('/\D+/', '', $raw) ?? '';

        if ($digits === '') {
            return ['ok' => false, 'normalized' => null, 'error' => 'GCash number is required.'];
        }

        if (str_starts_with($digits, '639') && strlen($digits) === 12) {
            $digits = '0'.substr($digits, 2);
        }

        if (str_starts_with($digits, '63') && strlen($digits) === 11) {
            $digits = '0'.substr($digits, 2);
        }

        if (! preg_match('/^09\d{9}$/', $digits)) {
            return ['ok' => false, 'normalized' => null, 'error' => 'Use a valid PH mobile number (09xxxxxxxxx).'];
        }

        return ['ok' => true, 'normalized' => $digits, 'error' => null];
    }

    public static function normalizeHolderName(string $raw): string
    {
        $t = trim(preg_replace('/\s+/', ' ', $raw) ?? '');

        return $t;
    }
}
