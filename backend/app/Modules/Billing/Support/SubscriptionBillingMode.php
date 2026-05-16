<?php

namespace App\Modules\Billing\Support;

final class SubscriptionBillingMode
{
    public const MANUAL = 'manual';

    public const AUTO_CARD = 'auto_card';

    public static function isAutoCard(?string $mode): bool
    {
        return $mode === self::AUTO_CARD;
    }

    public static function recurringActive(?string $mode, $recurringCancelledAt): bool
    {
        return self::isAutoCard($mode) && $recurringCancelledAt === null;
    }
}
