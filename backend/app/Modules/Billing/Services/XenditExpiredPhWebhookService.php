<?php

namespace App\Modules\Billing\Services;

use App\Models\Reservation;
use App\Models\SubscriptionInvoice;
use Illuminate\Support\Arr;

/**
 * Dedicated handler for Xendit invoice EXPIRED / FAILED callbacks (Philippines checkout).
 * Tries booking reservations first, then platform subscription invoices.
 */
class XenditExpiredPhWebhookService
{
    public function __construct(
        private readonly XenditWebhookService $bookingWebhooks,
        private readonly XenditSubscriptionWebhookService $subscriptionWebhooks,
    ) {}

    public function verifySignature(string $signature): void
    {
        $this->bookingWebhooks->verifySignature($signature);
    }

    /**
     * @return array{
     *     ignored: bool,
     *     reason?: string,
     *     reservation_id?: int|null,
     *     subscription_invoice_id?: int|null
     * }
     */
    public function handle(array $payload): array
    {
        $status = strtoupper((string) Arr::get($payload, 'status', ''));
        if ($status === '' || ! in_array($status, ['EXPIRED', 'FAILED'], true)) {
            return [
                'ignored' => true,
                'reason' => 'not_expired_or_failed',
            ];
        }

        $reservation = $this->bookingWebhooks->handleInvoicePaid($payload);
        $subscriptionInvoice = $this->subscriptionWebhooks->handleInvoiceWebhook($payload);

        return [
            'ignored' => false,
            'reservation_id' => $reservation instanceof Reservation ? $reservation->id : null,
            'subscription_invoice_id' => $subscriptionInvoice instanceof SubscriptionInvoice
                ? $subscriptionInvoice->id
                : null,
        ];
    }
}
