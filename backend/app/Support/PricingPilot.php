<?php

namespace App\Support;

final class PricingPilot
{
  public static function enabled(): bool
  {
    return (bool) config('pricing.pilot_mode', false);
  }

  public static function unit(): float
  {
    return max(0.01, (float) config('pricing.pilot_amount_php', 1));
  }

  public static function flatInvoiceAmount(): float
  {
    return self::unit();
  }

  public static function businessProMonthlyPhp(): float
  {
    if (self::enabled()) {
      return self::unit();
    }

    return (float) config('pricing.business_pro_monthly_php', 1000);
  }
}
