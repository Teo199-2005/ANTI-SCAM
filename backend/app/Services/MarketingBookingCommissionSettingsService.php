<?php

namespace App\Services;

use App\Models\SystemSetting;
use InvalidArgumentException;

/**
 * Admin-configurable booking commission rate. Amount is snapshotted on each credit event;
 * changing settings never alters past events, commission rows, or payout batches.
 */
class MarketingBookingCommissionSettingsService
{
    public const KEY_AMOUNT_PHP = 'marketing_booking_commission_php';

    public const KEY_ENABLED = 'marketing_booking_commission_enabled';

    public const MIN_AMOUNT_PHP = 1.0;

    public const MAX_AMOUNT_PHP = 5000.0;

    public function isEnabled(): bool
    {
        $fromDb = SystemSetting::getValue(self::KEY_ENABLED);
        if ($fromDb !== null) {
            return filter_var($fromDb, FILTER_VALIDATE_BOOLEAN);
        }

        return (bool) config('marketing_booking_commission.enabled', true);
    }

    /**
     * Rate used when crediting NEW bookings only (not for reversals or payouts).
     */
    public function amountPhpForNewCredits(): float
    {
        $fromDb = SystemSetting::getValue(self::KEY_AMOUNT_PHP);
        if ($fromDb !== null && $fromDb !== '') {
            return $this->normalizeAmount((string) $fromDb);
        }

        $fromEnv = config('marketing_booking_commission.amount_php');
        if ($fromEnv !== null && $fromEnv !== '') {
            return $this->normalizeAmount((string) $fromEnv);
        }

        return 10.0;
    }

    /**
     * @throws InvalidArgumentException
     */
    public function validateAmountForStorage(string $raw): string
    {
        $amount = $this->normalizeAmount($raw);

        return number_format($amount, 2, '.', '');
    }

    /**
     * @throws InvalidArgumentException
     */
    public function validateEnabledForStorage(string $raw): string
    {
        $bool = filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($bool === null) {
            throw new InvalidArgumentException('marketing_booking_commission_enabled must be true or false.');
        }

        return $bool ? 'true' : 'false';
    }

    public function policyNote(): string
    {
        return 'Changing the commission amount or toggle only affects new booking credits. '
            .'Amounts already stored on commission events and pending/released commission rows are never recalculated.';
    }

    /**
     * @throws InvalidArgumentException
     */
    private function normalizeAmount(string $raw): float
    {
        $normalized = str_replace(',', '', trim($raw));
        if ($normalized === '' || ! is_numeric($normalized)) {
            throw new InvalidArgumentException('Commission amount must be a number.');
        }

        $amount = round((float) $normalized, 2);
        if ($amount < self::MIN_AMOUNT_PHP || $amount > self::MAX_AMOUNT_PHP) {
            throw new InvalidArgumentException(
                sprintf(
                    'Commission amount must be between ₱%s and ₱%s.',
                    number_format(self::MIN_AMOUNT_PHP, 2),
                    number_format(self::MAX_AMOUNT_PHP, 2),
                ),
            );
        }

        return $amount;
    }
}
