<?php

namespace App\Modules\Billing\Services;

use App\Models\SubscriptionInvoice;
use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Billing\Support\SubscriptionInvoicePlanTag;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Services\EmailNotificationService;
use Illuminate\Support\Facades\DB;

class SubscriptionPaymentConfirmationService
{
  public function __construct(
    private readonly AuditLogService $audits,
    private readonly EmailNotificationService $emails,
    private readonly SubscriptionService $subscriptions,
  ) {}

  public function applyBaseSubscriptionPayment(SubscriptionInvoice $invoice): SubscriptionInvoice
  {
    $subscription = $invoice->subscription()->lockForUpdate()->first();
    if (! $subscription) {
      return $invoice;
    }

    $durationMonths = SubscriptionInvoicePlanTag::creditedMonthsFromPlan((string) $invoice->plan);
    if ($durationMonths < 1) {
      $durationMonths = 1;
    }

    if (SubscriptionInvoicePlanTag::isBusinessProUpgrade((string) $invoice->plan)) {
      $this->subscriptions->upgradeToBusinessPro($subscription);
      $subscription->refresh();
    }

    $oldValues = $subscription->only([
      'billing_cycle_start',
      'billing_cycle_end',
      'next_due_date',
      'status',
      'renewal_duration_months',
      'plan',
    ]);

    $newStart = $subscription->billing_cycle_end
      ? $subscription->billing_cycle_end->copy()->addDay()
      : now()->startOfDay();
    $newEnd = $newStart->copy()->addMonthsNoOverflow($durationMonths)->subDay();

    $subscription->update([
      'billing_cycle_start' => $newStart->toDateString(),
      'billing_cycle_end' => $newEnd->toDateString(),
      'next_due_date' => $newEnd->toDateString(),
      'status' => 'active',
      'grace_until' => null,
      'renewal_duration_months' => $durationMonths,
    ]);

    $this->audits->log(
      'subscription_payment_confirmed',
      'subscription',
      $subscription->id,
      $oldValues,
      $subscription->only([
        'billing_cycle_start',
        'billing_cycle_end',
        'next_due_date',
        'status',
        'renewal_duration_months',
        'plan',
      ])
    );

    $subscriptionForNotifications = $subscription->loadMissing('resort');
    $paidInvoice = $invoice->refresh();

    DB::afterCommit(function () use ($subscriptionForNotifications, $paidInvoice): void {
      if ($this->emails->shouldSendBusinessProActivationEmail($subscriptionForNotifications, $paidInvoice)) {
        $this->emails->sendBusinessProActivatedConfirmation($subscriptionForNotifications, $paidInvoice);

        return;
      }

      $this->emails->sendSubscriptionRenewalConfirmation($subscriptionForNotifications, $paidInvoice);
    });

    return $paidInvoice;
  }
}
