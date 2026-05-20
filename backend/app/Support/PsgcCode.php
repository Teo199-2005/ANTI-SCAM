<?php

namespace App\Support;

/**
 * PSGC code helpers aligned with SPA pickers (e.g. @jobuntux/psgc) and DB imports
 * where the same place may appear with or without leading zeros / digit-only forms.
 */
final class PsgcCode
{
    /**
     * @return list<string>
     */
    public static function candidates(?string $raw): array
    {
        if ($raw === null) {
            return [];
        }

        $trimmed = trim($raw);
        if ($trimmed === '') {
            return [];
        }

        $digits = preg_replace('/\D+/', '', $trimmed) ?? '';
        $out = [$trimmed];
        if ($digits !== '' && $digits !== $trimmed) {
            $out[] = $digits;
        }
        if ($digits !== '') {
            if (strlen($digits) < 10) {
                $padded = str_pad($digits, 10, '0', STR_PAD_LEFT);
                if (! in_array($padded, $out, true)) {
                    $out[] = $padded;
                }
            }
        }

        return array_values(array_unique(array_filter($out, static fn (string $v): bool => $v !== '')));
    }

    /**
     * Compare two geography codes ignoring non-digits and leading zero padding
     * (SPA pickers vs DB imports may differ in width).
     */
    public static function digitKey(string $candidate): string
    {
        $digits = preg_replace('/\D+/', '', $candidate) ?? '';
        $digits = ltrim($digits, '0');

        return $digits === '' ? '0' : $digits;
    }

    public static function same(?string $a, ?string $b): bool
    {
        if ($a === null || $b === null) {
            return false;
        }
        $a = trim((string) $a);
        $b = trim((string) $b);
        if ($a === '' || $b === '') {
            return false;
        }

        foreach (self::candidates($a) as $ca) {
            $ka = self::digitKey($ca);
            foreach (self::candidates($b) as $cb) {
                if ($ka === self::digitKey($cb)) {
                    return true;
                }
            }
        }

        return false;
    }
}
