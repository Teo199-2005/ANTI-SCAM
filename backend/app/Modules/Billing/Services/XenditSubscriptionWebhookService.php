<?php

namespace App\Modules\Billing\Services;

use App\Models\SubscriptionInvoice;
use App\Models\XenditWebhookEvent;
use App\Support\XenditInvoiceWebhookStatus;
use App\Modules\Audit\Services\AuditLogService;
use App\Services\DigitalAcknowledgmentReceiptService;
use App\Services\EmailNotificationService;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class XenditSubscriptionWebhookService
{
    public function __construct(
        private readonly XenditWebhookService $signatureVerifier,
        private readonly AuditLogService $audits,
        private readonly EmailNotificationService $emails,
        private readonly DigitalAcknowledgmentReceiptService $digitalReceipts,
        private readonly SubscriptionPaymentConfirmationService $paymentConfirmation,
        private readonly XenditRecurringSubscriptionService $recurring,
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

            if (XenditInvoiceWebhookStatus::isPaid($payload)) {
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

                    $paidInvoice = $this->paymentConfirmation->applyBaseSubscriptionPayment($invoice);

                    DB::afterCommit(function () use ($paidInvoice): void {
                        $this->recurring->activateRecurringAfterFirstPaid($paidInvoice);
                    });
                }
            } elseif (XenditInvoiceWebhookStatus::isExpiredOrFailed($payload)) {
                $invoice->update([
                    'status' => strtolower($status),
                ]);
            }

            return $invoice->refresh();
        });
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
