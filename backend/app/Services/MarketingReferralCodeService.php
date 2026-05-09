<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

class MarketingReferralCodeService
{
    /** Uppercase A–Z baseline from account holder last name + 4 numeric digits (unique). */
    public function generateUniqueForUser(User $user): string
    {
        $base = $this->baseFromFullName($user->name ?? 'Partner');

        for ($i = 0; $i < 80; $i++) {
            $suffix = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $candidate = $base.$suffix;
            if (! User::where('referral_code', $candidate)->exists()) {
                return $candidate;
            }
        }

        return $base.strtoupper(Str::random(4));
    }

    public function normalize(string $code): string
    {
        return strtoupper(trim($code));
    }

    private function baseFromFullName(string $fullName): string
    {
        $parts = preg_split('/\s+/u', trim($fullName)) ?: [];
        $last = $parts !== [] ? (string) end($parts) : 'PARTNER';
        $slug = strtoupper(preg_replace('/[^A-Za-z]/', '', $last) ?? '');
        if ($slug === '') {
            $slug = 'PARTNER';
        }

        return substr($slug, 0, 18);
    }
}
