<?php

namespace App\Services;

use App\Models\User;
use InvalidArgumentException;

/**
 * Per-marketer booking commission (nullable override on users.booking_commission_php).
 * Null override uses platform default from {@see MarketingBookingCommissionSettingsService}.
 */
class MarketerBookingCommissionRateService
{
    public function __construct(
        private readonly MarketingBookingCommissionSettingsService $platformSettings,
    ) {}

    public function platformDefaultAmountPhp(): float
    {
        return $this->platformSettings->amountPhpForNewCredits();
    }

    public function effectiveAmountPhpForMarketer(int $marketerId): float
    {
        $user = User::query()->where('id', $marketerId)->where('role', 'marketing')->first();

        return $this->effectiveAmountPhpForUser($user);
    }

    public function effectiveAmountPhpForUser(?User $user): float
    {
        if ($user !== null && $user->role === 'marketing' && $user->booking_commission_php !== null) {
            return round((float) $user->booking_commission_php, 2);
        }

        return $this->platformDefaultAmountPhp();
    }

    public function usesCustomRate(?User $user): bool
    {
        return $user !== null
            && $user->role === 'marketing'
            && $user->booking_commission_php !== null;
    }

    /**
     * @return array{effective_php: float, custom_php: float|null, uses_custom: bool, platform_default_php: float}
     */
    public function summaryForMarketer(User $user): array
    {
        $platform = $this->platformDefaultAmountPhp();
        $custom = $user->booking_commission_php !== null ? round((float) $user->booking_commission_php, 2) : null;

        return [
            'effective_php' => $this->effectiveAmountPhpForUser($user),
            'custom_php' => $custom,
            'uses_custom' => $custom !== null,
            'platform_default_php' => $platform,
        ];
    }

    /**
     * Validate and normalize for storage. Empty string / null clears override (use platform default).
     *
     * @throws InvalidArgumentException
     */
    public function normalizeOverrideForStorage(mixed $raw): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        return $this->platformSettings->validateAmountForStorage((string) $raw);
    }
}
