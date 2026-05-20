<?php

namespace App\Services;

use App\Models\Reservation;
use App\Modules\Billing\Services\BookingPaymentReconciliationService;
use App\Modules\Billing\Services\XenditInvoiceService;
use App\Modules\Billing\Services\XenditWebhookService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Releases inventory when guests abandon Xendit checkout or payment windows lapse.
 */
class ReservationCheckoutExpiryService
{
    public function __construct(
        private readonly XenditInvoiceService $invoices,
        private readonly XenditWebhookService $webhooks,
    ) {}

    public function holdMinutes(): int
    {
        return max(1, (int) config('booking.payment_hold_minutes', 10));
    }

    public function holdCutoff(): Carbon
    {
        return now()->subMinutes($this->holdMinutes());
    }

    public function paymentHoldStartedAt(Reservation $reservation): Carbon
    {
        if ($reservation->reserved_at instanceof Carbon) {
            return $reservation->reserved_at;
        }

        if ($reservation->created_at instanceof Carbon) {
            return $reservation->created_at;
        }

        return now();
    }

    public function isPaymentHoldActive(Reservation $reservation): bool
    {
        if ($reservation->status !== 'pending_payment') {
            return false;
        }

        return $this->paymentHoldStartedAt($reservation)->gte($this->holdCutoff());
    }

    /**
     * @param  Builder<Reservation>  $query
     * @return Builder<Reservation>
     */
    public function scopeActivePendingPaymentHold(Builder $query): Builder
    {
        $cutoff = $this->holdCutoff();

        return $query->where('status', 'pending_payment')
            ->where(function (Builder $inner) use ($cutoff): void {
                $inner->where('reserved_at', '>=', $cutoff)
                    ->orWhere(function (Builder $fallback) use ($cutoff): void {
                        $fallback->whereNull('reserved_at')
                            ->where('created_at', '>=', $cutoff);
                    });
            });
    }

    /**
     * @param  Builder<Reservation>  $query
     * @return Builder<Reservation>
     */
    public function scopeStalePendingPayment(Builder $query): Builder
    {
        $cutoff = $this->holdCutoff();

        return $query->where('status', 'pending_payment')
            ->where(function (Builder $inner) use ($cutoff): void {
                $inner->where('reserved_at', '<', $cutoff)
                    ->orWhere(function (Builder $fallback) use ($cutoff): void {
                        $fallback->whereNull('reserved_at')
                            ->where('created_at', '<', $cutoff);
                    });
            });
    }

    public function expireStalePendingPayments(?int $roomId = null, int $limit = 100): int
    {
        $q = Reservation::withoutGlobalScopes();
        $this->scopeStalePendingPayment($q);

        if ($roomId !== null) {
            $q->where('room_id', $roomId);
        }

        $expired = 0;
        foreach ($q->orderBy('id')->limit($limit)->get() as $reservation) {
            if ($this->finalizeStalePending($reservation)) {
                $expired++;
            }
        }

        return $expired;
    }

    /**
     * Guest backed out of Xendit or explicitly releases the slot before paying.
     */
    public function releaseAbandonedCheckout(Reservation $reservation): Reservation
    {
        if ($reservation->status !== 'pending_payment') {
            return $reservation->refresh();
        }

        if ($this->reconcilePaidIfApplicable($reservation)) {
            return $reservation->refresh();
        }

        $this->markExpired($reservation, 'checkout_abandoned');

        return $reservation->refresh();
    }

    /**
     * @return bool True when the row was marked expired (not paid).
     */
    public function finalizeStalePending(Reservation $reservation): bool
    {
        if ($reservation->status !== 'pending_payment') {
            return false;
        }

        if ($this->isPaymentHoldActive($reservation)) {
            return false;
        }

        if ($this->reconcilePaidIfApplicable($reservation)) {
            return false;
        }

        $invoiceId = $reservation->xendit_invoice_id;
        if ($invoiceId) {
            $payload = $this->invoices->fetchInvoicePayload((string) $invoiceId);
            if ($payload !== null) {
                $status = strtoupper((string) ($payload['status'] ?? ''));
                if ($status === 'PAID') {
                    $payload['event'] = 'invoice.paid';
                    $this->webhooks->handleInvoicePaid($payload);

                    return false;
                }
                if (in_array($status, ['EXPIRED', 'FAILED'], true)) {
                    $payload['event'] = 'invoice.expired';
                    $this->webhooks->handleInvoicePaid($payload);

                    return true;
                }
            }
        }

        $this->markExpired($reservation, 'payment_hold_lapsed');

        return true;
    }

    private function reconcilePaidIfApplicable(Reservation $reservation): bool
    {
        if ($reservation->xendit_invoice_id === null || $reservation->xendit_invoice_id === '') {
            return false;
        }

        return app(BookingPaymentReconciliationService::class)->reconcileReservation($reservation->fresh() ?? $reservation);
    }

    private function markExpired(Reservation $reservation, string $reason): void
    {
        if ($reservation->status !== 'pending_payment') {
            return;
        }

        $reservation->update([
            'status' => 'expired',
            'xendit_payment_status' => $reservation->xendit_payment_status === 'paid' ? 'paid' : 'expired',
        ]);
    }
}
