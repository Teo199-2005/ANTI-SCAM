<?php

namespace App\Modules\Billing\Services;

use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Billing\Support\SubscriptionInvoicePlanTag;
use App\Services\EmailNotificationService;
use App\Services\SubscriptionReferralCommissionService;
use Illuminate\Support\Facades\DB;

/**
 * Shared logic when a base subscription invoice is marked paid (checkout, cron, or recurring cycle).
 */
class SubscriptionPaymentConfirmationService
{
    public function __construct(
        private readonly AuditLogService $audits,
        private readonly EmailNotificationService $emails,
        private readonly SubscriptionReferralCommissionService $referralCommissions,
    ) {}

    public function applyBaseSubscriptionPayment(SubscriptionInvoice $invoice): SubscriptionInvoice
    {
        $subscription = $invoice->subscription()->lockForUpdate()->first();
        if (! $subscription) {
            return $invoice;
        }

        $durationMonths = SubscriptionInvoicePlanTag::creditedMonthsFromPlan((string) $invoice->plan);
        if ($durationMonths < 1) {
            $durationMonths = max(1, (int) $subscription->renewal_duration_months) ?: 1;
        }

        if ((int) $subscription->renewal_duration_months < 1) {
            $subscription->renewal_duration_months = $durationMonths;
        } elseif ($subscription->renewal_duration_months === 1 && $durationMonths > 1) {
            $subscription->renewal_duration_months = $durationMonths;
        }

        $oldValues = $subscription->only([
            'billing_cycle_start',
            'billing_cycle_end',
            'next_due_date',
            'status',
            'renewal_duration_months',
        ]);

        $newStart = $subscription->billing_cycle_end
            ? $subscription->billing_cycle_end->copy()->addDay()
            : now()->startOfMonth();
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
            ])
        );

        $this->referralCommissions->creditFromPaidMonthlyInvoice($invoice);

        $subscriptionForNotifications = $subscription->loadMissing('resort');
        $paidInvoice = $invoice->refresh();

        DB::afterCommit(function () use ($subscriptionForNotifications, $paidInvoice): void {
            $this->emails->sendSubscriptionRenewalConfirmation($subscriptionForNotifications, $paidInvoice);
        });

        return $paidInvoice;
    }
}
