<?php

namespace App\Support;

class BankAccountNormalizer
{
    /** @return array{ok: bool, normalized: ?string, error: ?string} */
    public static function normalizeAccountNumber(string $raw, int $minLen = 4, int $maxLen = 34): array
    {
        $acct = preg_replace('/\s+/', '', $raw) ?? '';
        if ($acct === '') {
            return ['ok' => false, 'normalized' => null, 'error' => 'Bank account number is required.'];
        }

        if (! preg_match('/^[\p{L}\p{N}\-]+$/u', $acct)) {
            return ['ok' => false, 'normalized' => null, 'error' => 'Use only letters, numbers, and hyphens.'];
        }

        if (strlen($acct) < $minLen) {
            return ['ok' => false, 'normalized' => null, 'error' => 'Enter a valid account number.'];
        }

        if (strlen($acct) > $maxLen) {
            return ['ok' => false, 'normalized' => null, 'error' => 'Account number is too long.'];
        }

        return ['ok' => true, 'normalized' => $acct, 'error' => null];
    }

    public static function normalizeHolderName(string $raw): string
    {
        return GcashAccountNormalizer::normalizeHolderName($raw);
    }
}
