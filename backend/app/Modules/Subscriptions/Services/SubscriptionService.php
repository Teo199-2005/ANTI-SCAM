<?php

namespace App\Modules\Subscriptions\Services;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SystemSetting;
use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Rooms\Services\RoomService;
use App\Services\EmailNotificationService;
use App\Services\ReferralSignupTrialService;
use App\Support\SubscriptionPlan;

class SubscriptionService
{
  public function __construct(
    private readonly AuditLogService $audits,
    private readonly EmailNotificationService $emails
  ) {}

  public function calculateMonthlyBilling(string $plan, int $roomCount): array
  {
    return SubscriptionPlan::billingSnapshot($plan, $roomCount);
  }

  /**
   * @param  bool  $activateIfNew  When true, new subscriptions start active on Standard (default for owner signup).
   */
  public function refreshForResort(Resort $resort, string $plan = SubscriptionPlan::STANDARD, bool $activateIfNew = true): Subscription
  {
    $plan = SubscriptionPlan::normalize($plan);
    $roomCount = $resort->rooms()->where('status', 'active')->count();
    $pricing = $this->calculateMonthlyBilling($plan, $roomCount);

    $subscription = Subscription::query()->firstOrNew([
      'resort_id' => $resort->id,
      'tenant_id' => $resort->tenant_id,
    ]);

    $oldValues = $subscription->exists
      ? $subscription->only(['plan', 'base_price', 'extra_room_fee', 'active_room_count', 'total_monthly_fee', 'status'])
      : null;

    if ($subscription->exists) {
      $pricing['plan'] = $plan;
      $subscription->fill($pricing);
    } else {
      $subscription->fill($pricing);
      $subscription->status = 'active';
      $cycleStart = now()->startOfDay();
      $subscription->billing_cycle_start = $cycleStart->toDateString();

      if ($plan === SubscriptionPlan::BUSINESS_PRO) {
        $cycleEnd = $cycleStart->copy()->addMonth()->subDay();
        $subscription->billing_cycle_end = $cycleEnd->toDateString();
        $subscription->next_due_date = $cycleEnd->toDateString();
      } else {
        $subscription->billing_cycle_end = null;
        $subscription->next_due_date = null;
      }
    }

    if ($plan === SubscriptionPlan::STANDARD) {
      if (! $subscription->billing_cycle_start) {
        $subscription->billing_cycle_start = now()->startOfDay()->toDateString();
      }
      $subscription->billing_cycle_end = null;
      $subscription->next_due_date = null;
      $subscription->grace_until = null;
    }

    $subscription->save();

    if ($activateIfNew && ! $resort->is_publicly_listed) {
      $resort->update(['is_publicly_listed' => true]);
    }

    $this->audits->log(
      'subscription_recalculated',
      'subscription',
      $subscription->id,
      $oldValues,
      $subscription->only(['plan', 'base_price', 'extra_room_fee', 'active_room_count', 'total_monthly_fee', 'status'])
    );

    return $subscription->refresh();
  }

  public function upgradeToBusinessPro(Subscription $subscription): Subscription
  {
    $old = $subscription->only(['plan', 'included_rooms', 'base_price', 'status']);

    SubscriptionPlan::applyPlanToSubscription($subscription, SubscriptionPlan::BUSINESS_PRO);
    $subscription->status = 'active';
    $subscription->grace_until = null;
    $subscription->renewal_duration_months = 1;

    $cycleStart = now()->startOfDay();
    $cycleEnd = $cycleStart->copy()->addMonth()->subDay();
    if (! $subscription->billing_cycle_start) {
      $subscription->billing_cycle_start = $cycleStart->toDateString();
    }
    $subscription->billing_cycle_end = $cycleEnd->toDateString();
    $subscription->next_due_date = $cycleEnd->toDateString();
    $subscription->save();

    $subscription->resort?->update(['is_publicly_listed' => true]);

    $this->audits->log('subscription_upgraded_business_pro', 'subscription', $subscription->id, $old, $subscription->only(['plan', 'included_rooms', 'status']));

    return $subscription->refresh();
  }

  public function downgradeToStandard(Subscription $subscription, bool $reconcileRooms = true): Subscription
  {
    $old = $subscription->only(['plan', 'included_rooms', 'status']);

    SubscriptionPlan::applyPlanToSubscription($subscription, SubscriptionPlan::STANDARD);
    $subscription->status = 'active';
    $subscription->grace_until = null;
    if (! $subscription->billing_cycle_start) {
      $subscription->billing_cycle_start = now()->startOfDay()->toDateString();
    }
    $subscription->billing_cycle_end = null;
    $subscription->next_due_date = null;
    $subscription->renewal_duration_months = null;
    $subscription->save();

    $resort = $subscription->resort;
    if ($resort) {
      $resort->update([
        'is_publicly_listed' => true,
        'admin_landing_embed_enabled' => false,
      ]);
      if ($reconcileRooms) {
        app(RoomService::class)->reconcileResortActiveRooms((int) $resort->id);
      }
    }

    $this->audits->log('subscription_downgraded_standard', 'subscription', $subscription->id, $old, $subscription->only(['plan', 'included_rooms', 'status']));

    return $subscription->refresh();
  }

  public function applyGracePeriodRules(): int
  {
    $updated = app(ReferralSignupTrialService::class)->expireLapsedTrials();

    $graceDays = max(1, (int) SystemSetting::getValue('grace_period_days', 7));

    Subscription::query()
      ->where('plan', SubscriptionPlan::BUSINESS_PRO)
      ->where('status', 'active')
      ->whereNotNull('next_due_date')
      ->whereDate('next_due_date', '<', now()->toDateString())
      ->with('resort')
      ->chunkById(100, function ($subscriptions) use (&$updated, $graceDays): void {
        foreach ($subscriptions as $subscription) {
          $subscription->status = 'grace_period';
          $subscription->grace_until = now()->addDays($graceDays)->toDateString();
          $subscription->save();
          $this->emails->sendGracePeriodAlert($subscription);
          $updated++;
        }
      });

    Subscription::query()
      ->where('plan', SubscriptionPlan::BUSINESS_PRO)
      ->where('status', 'grace_period')
      ->whereNotNull('grace_until')
      ->whereDate('grace_until', '<', now()->toDateString())
      ->with('resort')
      ->chunkById(100, function ($subscriptions) use (&$updated): void {
        foreach ($subscriptions as $subscription) {
          $this->downgradeToStandard($subscription);
          if ($subscription->resort) {
            $this->emails->sendSubscriptionDowngradeNotice($subscription);
          }
          $updated++;
        }
      });

    return $updated;
  }
}
