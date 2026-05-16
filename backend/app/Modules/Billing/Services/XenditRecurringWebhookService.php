<?php

namespace App\Modules\Billing\Services;

use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\XenditWebhookEvent;
use App\Modules\Billing\Support\SubscriptionInvoicePlanTag;
use App\Services\DigitalAcknowledgmentReceiptService;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class XenditRecurringWebhookService
{
    public function __construct(
        private readonly XenditWebhookService $signatureVerifier,
        private readonly SubscriptionPaymentConfirmationService $paymentConfirmation,
        private readonly XenditSubscriptionInvoiceService $invoiceAmounts,
        private readonly DigitalAcknowledgmentReceiptService $digitalReceipts,
    ) {}

    public function verifySignature(string $signature): void
    {
        $recurringToken = (string) config('services.xendit.recurring_webhook_token', '');
        if ($recurringToken !== '' && hash_equals($recurringToken, $signature)) {
            return;
        }

        $this->signatureVerifier->verifySignature($signature);
    }

    public function handle(array $payload): ?SubscriptionInvoice
    {
        return DB::transaction(function () use ($payload) {
            $eventId = (string) (
                Arr::get($payload, 'id')
                ?? Arr::get($payload, 'event_id')
                ?? Arr::get($payload, 'data.id')
                ?? ''
            );
            if ($eventId === '') {
                return null;
            }

            $webhookEventId = 'rec-'.$eventId;

            if (XenditWebhookEvent::query()->where('event_id', $webhookEventId)->lockForUpdate()->exists()) {
                return null;
            }

            $status = strtoupper((string) (
                Arr::get($payload, 'status')
                ?? Arr::get($payload, 'data.status')
                ?? ''
            ));
            $paidStatuses = ['SUCCEEDED', 'SUCCESS', 'PAID', 'COMPLETED'];
            if (! in_array($status, $paidStatuses, true)) {
                return null;
            }

            $planId = (string) (
                Arr::get($payload, 'plan_id')
                ?? Arr::get($payload, 'recurring_plan_id')
                ?? Arr::get($payload, 'data.plan_id')
                ?? Arr::get($payload, 'data.recurring_plan_id')
                ?? ''
            );
            if ($planId === '') {
                return null;
            }

            $subscription = Subscription::withoutGlobalScopes()
                ->where('xendit_recurring_plan_id', $planId)
                ->lockForUpdate()
                ->first();

            if (! $subscription) {
                return null;
            }

            $cycleId = (string) (
                Arr::get($payload, 'cycle_id')
                ?? Arr::get($payload, 'recurring_cycle_id')
                ?? Arr::get($payload, 'data.cycle_id')
                ?? Arr::get($payload, 'data.id')
                ?? $eventId
            );

            $existing = SubscriptionInvoice::query()
                ->where('xendit_recurring_cycle_id', $cycleId)
                ->lockForUpdate()
                ->first();

            if ($existing?->status === 'paid') {
                XenditWebhookEvent::create([
                    'event_id' => $webhookEventId,
                    'event_type' => (string) (Arr::get($payload, 'event') ?? 'recurring.cycle'),
                    'invoice_id' => $cycleId,
                    'processed_at' => now(),
                ]);

                return $existing;
            }

            $durationMonths = max(1, (int) $subscription->renewal_duration_months) ?: 1;
            $amount = $this->invoiceAmounts->resolveChargeAmount($subscription, 'monthly', 1, $durationMonths);
            $planTag = SubscriptionInvoicePlanTag::baseMonthly((string) $subscription->plan, $durationMonths, false);

            $paidMoment = now();
            $ackNo = $this->digitalReceipts->allocate(
                DigitalAcknowledgmentReceiptService::KIND_SUBSCRIPTION,
                $paidMoment
            );

            $invoice = $existing ?? new SubscriptionInvoice([
                'tenant_id' => $subscription->tenant_id,
                'subscription_id' => $subscription->id,
                'resort_id' => $subscription->resort_id,
            ]);

            $invoice->fill([
                'amount' => $amount,
                'plan' => $planTag,
                'status' => 'paid',
                'source' => 'recurring_cycle',
                'xendit_recurring_cycle_id' => $cycleId,
                'billing_cycle_start' => $subscription->billing_cycle_start,
                'billing_cycle_end' => $subscription->billing_cycle_end,
                'paid_at' => $paidMoment,
                'acknowledgment_receipt_no' => $ackNo,
            ]);
            $invoice->save();

            XenditWebhookEvent::create([
                'event_id' => $webhookEventId,
                'event_type' => (string) (Arr::get($payload, 'event') ?? 'recurring.cycle'),
                'invoice_id' => $cycleId,
                'processed_at' => now(),
            ]);

            return $this->paymentConfirmation->applyBaseSubscriptionPayment($invoice);
        });
    }
}
