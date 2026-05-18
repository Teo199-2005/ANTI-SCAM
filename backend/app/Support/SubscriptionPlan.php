<?php

namespace App\Support;

use App\Models\Subscription;

final class SubscriptionPlan
{
  public const STANDARD = 'standard';

  public const BUSINESS_PRO = 'business_pro';

  public const ENTERPRISE = 'enterprise';

  /** @var list<string> */
  public const ALL = [self::STANDARD, self::BUSINESS_PRO, self::ENTERPRISE];

  public static function normalize(?string $plan): string
  {
    $plan = strtolower(trim((string) $plan));

    return match ($plan) {
      self::BUSINESS_PRO, 'premium', 'vip', 'pro' => self::BUSINESS_PRO,
      self::ENTERPRISE => self::ENTERPRISE,
      default => self::STANDARD,
    };
  }

  /**
   * @return array<string, array<string, mixed>>
   */
  public static function plans(): array
  {
    $plans = config('subscription_plans');
    if (is_array($plans) && isset($plans[self::STANDARD])) {
      return $plans;
    }

    $path = config_path('subscription_plans.php');
    if (is_file($path)) {
      $loaded = require $path;
      if (is_array($loaded) && isset($loaded[self::STANDARD])) {
        return $loaded;
      }
    }

    return self::builtinPlans();
  }

  /**
   * @return array<string, mixed>
   */
  public static function config(string $plan): array
  {
    $plan = self::normalize($plan);
    $plans = self::plans();

    return $plans[$plan] ?? $plans[self::STANDARD];
  }

  /**
   * @return array<string, array<string, mixed>>
   */
  private static function builtinPlans(): array
  {
    return [
      self::STANDARD => [
        'label' => 'Verified Resort',
        'badge_label' => 'Verified Resort',
        'max_rooms' => 10,
        'monthly_price_php' => 0,
        'listing_priority' => 0,
        'features' => [
          'pms', 'calendar', 'booking_site', 'notifications', 'guest_dashboard',
          'reservation_management', 'online_booking', 'payment_methods', 'verified_listing',
        ],
      ],
      self::BUSINESS_PRO => [
        'label' => 'Premium Verified Resort',
        'badge_label' => 'Premium Verified Resort',
        'max_rooms' => 20,
        'monthly_price_php' => 1000,
        'listing_priority' => 100,
        'features' => [
          'analytics', 'revenue_reports', 'guest_traffic_analytics', 'conversion_reports',
          'video_embed', 'priority_listing', 'downloadable_reports', 'priority_support',
          'reward_growth_program', 'business_insights',
        ],
      ],
      self::ENTERPRISE => [
        'label' => 'Enterprise',
        'badge_label' => 'Enterprise Resort',
        'max_rooms' => 50,
        'monthly_price_php' => 0,
        'listing_priority' => 200,
        'features' => [],
      ],
    ];
  }

  public static function maxRooms(?string $plan): int
  {
    return (int) (self::config((string) $plan)['max_rooms'] ?? 10);
  }

  public static function monthlyPricePhp(?string $plan): float
  {
    return (float) (self::config((string) $plan)['monthly_price_php'] ?? 0);
  }

  public static function badgeLabel(?string $plan): string
  {
    return (string) (self::config((string) $plan)['badge_label'] ?? 'Verified Resort');
  }

  public static function listingPriority(?string $plan): int
  {
    return (int) (self::config((string) $plan)['listing_priority'] ?? 0);
  }

  public static function isBusinessPro(?string $plan): bool
  {
    return self::normalize($plan) === self::BUSINESS_PRO;
  }

  public static function hasFeature(?string $plan, string $feature): bool
  {
    $plan = self::normalize($plan);
    $cfg = self::config($plan);
    $features = $cfg['features'] ?? [];

    if (! is_array($features)) {
      return false;
    }

    if (in_array($feature, $features, true)) {
      return true;
    }

    if ($plan === self::BUSINESS_PRO) {
      $standard = self::config(self::STANDARD);
      $standardFeatures = is_array($standard['features'] ?? null) ? $standard['features'] : [];

      return in_array($feature, $standardFeatures, true);
    }

    return false;
  }

  public static function maxRoomsForSubscription(?Subscription $subscription): int
  {
    if (! $subscription) {
      return self::maxRooms(self::STANDARD);
    }

    $fromPlan = self::maxRooms($subscription->plan);
    $stored = (int) $subscription->included_rooms;

    if ($stored > 0 && $stored <= $fromPlan) {
      return $stored;
    }

    return $fromPlan;
  }

  /**
   * @return array{plan: string, base_price: float, included_rooms: int, extra_room_fee: float, active_room_count: int, total_monthly_fee: float}
   */
  public static function billingSnapshot(string $plan, int $roomCount): array
  {
    $plan = self::normalize($plan);
    $maxRooms = self::maxRooms($plan);
    $monthly = self::monthlyPricePhp($plan);

    if (\App\Support\PricingPilot::enabled()) {
      $monthly = \App\Support\PricingPilot::unit();
    }

    return [
      'plan' => $plan,
      'base_price' => $monthly,
      'included_rooms' => $maxRooms,
      'extra_room_fee' => 0,
      'active_room_count' => $roomCount,
      'total_monthly_fee' => $monthly,
    ];
  }

  public static function applyPlanToSubscription(Subscription $subscription, string $plan): void
  {
    $plan = self::normalize($plan);
    $snapshot = self::billingSnapshot($plan, (int) $subscription->active_room_count);
    $subscription->fill($snapshot);
  }
}
