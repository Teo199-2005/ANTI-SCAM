<?php

namespace App\Support;

final class PricingPilot
{
    public static function enabled(): bool
    {
        return (bool) config('pricing.pilot_mode', false);
    }

    /** Pilot unit (PHP), minimum 0.01 when pilot is on. */
    public static function unit(): float
    {
        return max(0.01, (float) config('pricing.pilot_amount_php', 1));
    }

    /** Flat amount charged per Xendit invoice while pilot is active. */
    public static function flatInvoiceAmount(): float
    {
        return self::unit();
    }

    public static function subscriptionTierReference(): float
    {
        return (float) config('pricing.subscription_tier_reference_php', 2100);
    }

    /**
     * @return array<int, float> duration months => effective monthly rate (PHP)
     */
    public static function subscriptionTierMonthlyPhp(): array
    {
        /** @var array<int, float> $map */
        $map = config('pricing.subscription_tier_monthly_php', [
            1 => 2100.0,
            3 => 1900.0,
            6 => 1700.0,
            12 => 1500.0,
        ]);

        return $map;
    }
}
