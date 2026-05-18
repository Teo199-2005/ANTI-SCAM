<?php

namespace App\Services;

use App\Models\Resort;
use App\Models\Subscription;
use App\Support\SubscriptionPlan;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Response;

class PlanFeatureResolver
{
  public function subscriptionForResort(?Resort $resort): ?Subscription
  {
    if (! $resort) {
      return null;
    }

    return $resort->subscription ?? Subscription::query()->where('resort_id', $resort->id)->first();
  }

  public function effectivePlan(?Subscription $subscription): string
  {
    if (! $subscription) {
      return SubscriptionPlan::STANDARD;
    }

    if (in_array($subscription->status, ['active', 'grace_period'], true)) {
      return SubscriptionPlan::normalize($subscription->plan);
    }

    return SubscriptionPlan::STANDARD;
  }

  public function hasFeature(?Subscription $subscription, string $feature): bool
  {
    $plan = $this->effectivePlan($subscription);

    if ($plan === SubscriptionPlan::BUSINESS_PRO) {
      return SubscriptionPlan::hasFeature($plan, $feature)
        || SubscriptionPlan::hasFeature(SubscriptionPlan::STANDARD, $feature);
    }

    return SubscriptionPlan::hasFeature($plan, $feature);
  }

  public function assertFeature(?Subscription $subscription, string $feature): void
  {
    if ($this->hasFeature($subscription, $feature)) {
      return;
    }

    throw new HttpResponseException(Response::json([
      'success' => false,
      'message' => 'This feature requires the Business Pro plan.',
      'errors' => [
        'feature' => [$feature],
        'required_plan' => [SubscriptionPlan::BUSINESS_PRO],
      ],
    ], 403));
  }
}
