<?php

namespace App\Modules\Billing\Services;

use App\Models\Reservation;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Polls Xendit for invoice status when webhooks are delayed or dropped.
 * Reuses {@see XenditWebhookService::handleInvoicePaid} for a single source of payment truth.
 */
class BookingPaymentReconciliationService
{
    public function __construct(
        private readonly XenditInvoiceService $invoices,
        private readonly XenditWebhookService $webhooks,
    ) {}

    /**
     * Reconcile all stale pending-payment rows that already have a Xendit invoice id.
     *
     * @return int Number of reservations transitioned to paid/confirmed by this run.
     */
    public function reconcileStalePendingPayments(): int
    {
        $updated = 0;

        Reservation::withoutGlobalScopes()
            ->whereNotNull('xendit_invoice_id')
            ->where('status', 'pending_payment')
            ->where(function ($q): void {
                $q->where('xendit_payment_status', 'pending')
                    ->orWhereNull('xendit_payment_status');
            })
            ->orderBy('id')
            ->chunkById(100, function ($chunk) use (&$updated): void {
                foreach ($chunk as $reservation) {
                    if ($this->reconcileReservation($reservation)) {
                        $updated++;
                    }
                }
            });

        return $updated;
    }

    /**
     * Poll Xendit for the current user's outstanding booking invoices (webhook may be missing locally
     * or delayed). Call from reservation list endpoints so the dashboard matches paid checkout quickly.
     *
     * @return int Number of reservations confirmed from this poll
     */
    public function syncPendingInvoicePaymentsForBooker(User $user, int $limit = 8): int
    {
        if (! in_array($user->role, ['guest', 'client', 'user'], true)) {
            return 0;
        }

        $q = Reservation::withoutGlobalScopes()
            ->where('client_id', $user->id)
            ->where('status', 'pending_payment')
            ->whereNotNull('xendit_invoice_id')
            ->where(function ($inner): void {
                $inner->where('xendit_payment_status', 'pending')
                    ->orWhereNull('xendit_payment_status');
            });

        if ($user->role === 'guest' && $user->home_resort_id) {
            $q->where('resort_id', (int) $user->home_resort_id);
        } elseif (in_array($user->role, ['client', 'user'], true)) {
            $q->where('tenant_id', (int) $user->tenant_id);
        }

        $updated = 0;
        foreach ($q->orderByDesc('id')->limit(max(1, min(25, $limit)))->get() as $reservation) {
            if ($this->reconcileReservation($reservation)) {
                $updated++;
            }
        }

        return $updated;
    }

    public function reconcileReservation(Reservation $reservation): bool
    {
        $invoiceId = $reservation->xendit_invoice_id;
        if ($invoiceId === null || $invoiceId === '') {
            return false;
        }

        if ($reservation->xendit_payment_status === 'paid' && $reservation->status === 'confirmed') {
            return false;
        }

        $payload = $this->invoices->fetchInvoicePayload($invoiceId);
        if ($payload === null) {
            return false;
        }

        $status = strtoupper((string) ($payload['status'] ?? ''));
        if ($status !== 'PAID') {
            return false;
        }

        $payload['event'] = 'invoice.paid';

        $this->webhooks->handleInvoicePaid($payload);

        Log::info('booking_payment_reconciled_from_xendit_poll', [
            'reservation_id' => $reservation->id,
            'invoice_id' => $invoiceId,
        ]);

        return true;
    }
}
