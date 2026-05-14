<?php

namespace App\Modules\Billing\Services;

use App\Models\SubscriptionInvoice;
use App\Models\XenditWebhookEvent;
use App\Modules\Audit\Services\AuditLogService;
use App\Services\DigitalAcknowledgmentReceiptService;
use App\Services\EmailNotificationService;
use App\Services\SubscriptionReferralCommissionService;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class XenditSubscriptionWebhookService
{
    public function __construct(
        private readonly XenditWebhookService $signatureVerifier,
        private readonly AuditLogService $audits,
        private readonly EmailNotificationService $emails,
        private readonly SubscriptionReferralCommissionService $referralCommissions,
        private readonly DigitalAcknowledgmentReceiptService $digitalReceipts,
    ) {}

    public function verifySignature(string $signature): void
    {
        $this->signatureVerifier->verifySignature($signature);
    }

    public function handleInvoiceWebhook(array $payload): ?SubscriptionInvoice
    {
        return DB::transaction(function () use ($payload) {
            $eventId = (string) (Arr::get($payload, 'id') ?? Arr::get($payload, 'external_id') ?? '');
            $invoiceId = (string) (Arr::get($payload, 'id') ?? '');
            $status = (string) (Arr::get($payload, 'status') ?? '');
            $eventType = (string) (Arr::get($payload, 'event') ?? '');

            if ($eventId === '' || $invoiceId === '' || $status === '') {
                return null;
            }

            $webhookEventId = 'sub-'.$eventId;

            $alreadyProcessed = XenditWebhookEvent::query()
                ->where('event_id', $webhookEventId)
                ->lockForUpdate()
                ->exists();

            if ($alreadyProcessed) {
                return SubscriptionInvoice::query()
                    ->where('xendit_invoice_id', $invoiceId)
                    ->first();
            }

            XenditWebhookEvent::create([
                'event_id' => $webhookEventId,
                'event_type' => $eventType,
                'invoice_id' => $invoiceId,
                'processed_at' => now(),
            ]);

            $invoice = SubscriptionInvoice::query()
                ->where('xendit_invoice_id', $invoiceId)
                ->lockForUpdate()
                ->first();

            if (! $invoice) {
                return null;
            }

            if ($eventType === 'invoice.paid' && $status === 'PAID') {
                $paidMoment = now();
                $ackNo = $invoice->acknowledgment_receipt_no;
                if ($ackNo === null || $ackNo === '') {
                    $ackNo = $this->digitalReceipts->allocate(
                        DigitalAcknowledgmentReceiptService::KIND_SUBSCRIPTION,
                        $paidMoment
                    );
                }

                $invoice->update([
                    'status' => 'paid',
                    'paid_at' => $paidMoment,
                    'acknowledgment_receipt_no' => $ackNo,
                ]);
                $invoice->refresh();

                $subscription = $invoice->subscription()->lockForUpdate()->first();
                if ($subscription) {
                    $isRoomAddonInvoice = is_string($invoice->plan) && str_contains((string) $invoice->plan, '_room_addon');

                    if ($isRoomAddonInvoice) {
                        $oldValues = $subscription->only([
                            'included_rooms',
                            'active_room_count',
                            'total_monthly_fee',
                            'status',
                        ]);

                        $extraRoomFee = (float) $subscription->extra_room_fee;
                        $invoiceAmount = (float) $invoice->amount;
                        $paidQuantity = $this->parseRoomAddonSlotQuantity((string) $invoice->plan, $invoiceAmount, $extraRoomFee);

                        $subscription->included_rooms = max(0, (int) $subscription->included_rooms) + $paidQuantity;
                        $subscription->active_room_count = $subscription->resort
                            ? $subscription->resort->rooms()->where('status', 'active')->count()
                            : (int) $subscription->active_room_count;
                        $subscription->total_monthly_fee = max(
                            0,
                            (float) $subscription->base_price
                            + max(0, $subscription->active_room_count - (int) $subscription->included_rooms) * (float) $subscription->extra_room_fee
                        );
                        $subscription->status = 'active';
                        $subscription->grace_until = null;
                        $subscription->save();

                        $this->audits->log(
                            'subscription_room_addon_paid',
                            'subscription',
                            $subscription->id,
                            $oldValues,
                            $subscription->only([
                                'included_rooms',
                                'active_room_count',
                                'total_monthly_fee',
                                'status',
                            ])
                        );

                        $subscriptionForNotifications = $subscription->loadMissing('resort');
                        $paidInvoice = $invoice->refresh();
                        DB::afterCommit(function () use ($subscriptionForNotifications, $paidInvoice): void {
                            $this->emails->sendSubscriptionRenewalConfirmation($subscriptionForNotifications, $paidInvoice);
                        });

                        return $paidInvoice;
                    }

                    $oldValues = $subscription->only([
                        'billing_cycle_start',
                        'billing_cycle_end',
                        'next_due_date',
                        'status',
                    ]);

                    $newStart = $subscription->billing_cycle_end
                        ? $subscription->billing_cycle_end->copy()->addDay()
                        : now()->startOfMonth();
                    // extractTermFromPlan returns the full subscription term to credit,
                    // already accounting for first-month-free and legacy bonus plans.
                    $creditedMonths = $this->extractTermFromPlan((string) $invoice->plan);
                    $newEnd = $newStart->copy()->addMonthsNoOverflow($creditedMonths)->subDay();

                    $subscription->update([
                        'billing_cycle_start' => $newStart->toDateString(),
                        'billing_cycle_end' => $newEnd->toDateString(),
                        'next_due_date' => $newEnd->toDateString(),
                        'status' => 'active',
                        'grace_until' => null,
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
                        ])
                    );

                    $this->referralCommissions->creditFromPaidMonthlyInvoice($invoice);

                    $subscriptionForNotifications = $subscription->loadMissing('resort');
                    $paidInvoice = $invoice->refresh();
                    DB::afterCommit(function () use ($subscriptionForNotifications, $paidInvoice): void {
                        $this->emails->sendSubscriptionRenewalConfirmation($subscriptionForNotifications, $paidInvoice);
                    });
                }
            } elseif (in_array($status, ['EXPIRED', 'FAILED'], true)) {
                $invoice->update([
                    'status' => strtolower($status),
                ]);
            }

            return $invoice->refresh();
        });
    }

    /**
     * Return the number of months to credit to the subscription when an invoice is paid.
     *
     * - _fmf (first-month-free): full N-month term is credited even though only N-1 months
     *   were charged (the owner got the first month free via referral).
     * - _bN (legacy bonus): paidMonths + bonusMonths (keep backwards-compat for old invoices).
     * - fallback: 1 month.
     */
    private function extractTermFromPlan(string $invoicePlan): int
    {
        if (preg_match('/_m(\d+)_fmf$/', $invoicePlan, $m) === 1) {
            return max(1, (int) $m[1]);
        }

        if (preg_match('/_m(\d+)_b(\d+)$/', $invoicePlan, $m) === 1) {
            return max(1, (int) $m[1] + (int) $m[2]);
        }

        return 1;
    }

    /**
     * Slots purchased (not months). New invoices use plan …_room_addon_q{n}_m{t}; legacy uses …_room_addon with amount ÷ fee.
     */
    private function parseRoomAddonSlotQuantity(string $invoicePlan, float $invoiceAmount, float $extraRoomFee): int
    {
        if (preg_match('/_room_addon_q(\d+)_m\d+/', $invoicePlan, $m) === 1) {
            return max(1, (int) $m[1]);
        }

        if ($extraRoomFee > 0.0) {
            return max(1, (int) round($invoiceAmount / $extraRoomFee));
        }

        return 1;
    }
}
