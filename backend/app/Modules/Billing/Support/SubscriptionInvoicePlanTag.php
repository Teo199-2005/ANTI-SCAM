<?php

namespace App\Modules\Billing\Support;

use App\Support\SubscriptionPlan;

final class SubscriptionInvoicePlanTag
{
  public static function businessProMonthly(bool $setupRecurring): string
  {
    return $setupRecurring
      ? SubscriptionPlan::BUSINESS_PRO.'_m1_rec'
      : SubscriptionPlan::BUSINESS_PRO.'_m1';
  }

  public static function requestsRecurringSetup(string $invoicePlan): bool
  {
    return str_ends_with($invoicePlan, '_rec');
  }

  public static function creditedMonthsFromPlan(string $invoicePlan): int
  {
    if (preg_match('/_m(\d+)(?:_rec)?$/', $invoicePlan, $m) === 1) {
      return max(1, (int) $m[1]);
    }

    return 1;
  }

  public static function isBusinessProUpgrade(string $invoicePlan): bool
  {
    return str_starts_with($invoicePlan, SubscriptionPlan::BUSINESS_PRO);
  }
}
