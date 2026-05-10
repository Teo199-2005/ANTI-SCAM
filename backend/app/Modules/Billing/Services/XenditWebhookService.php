<?php

namespace App\Modules\Billing\Services;

use App\Models\Reservation;
use App\Models\User;
use App\Models\XenditWebhookEvent;
use App\Modules\Audit\Services\AuditLogService;
use App\Services\EmailNotificationService;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class XenditWebhookService
{
    public function __construct(
        private readonly AuditLogService $audits,
        private readonly EmailNotificationService $emails
    ) {}

    public function verifySignature(string $signature): void
    {
        $configured = (string) config('services.xendit.webhook_token');
        // Reject all callbacks when webhook token is not configured.
        if (trim($configured) === '') {
            throw ValidationException::withMessages(['signature' => ['Webhook token is not configured.']]);
        }

        if (trim($signature) === '' || ! hash_equals($configured, $signature)) {
            throw ValidationException::withMessages(['signature' => ['Invalid Xendit signature.']]);
        }
    }

    public function handleInvoicePaid(array $payload): ?Reservation
    {
        return DB::transaction(function () use ($payload) {
            $eventId = (string) (Arr::get($payload, 'id') ?? Arr::get($payload, 'external_id') ?? '');
            $invoiceId = Arr::get($payload, 'id');
            $status = Arr::get($payload, 'status');
            $eventType = Arr::get($payload, 'event');

            if ($eventId === '' || ! $invoiceId || ! $status) {
                return null;
            }

            $alreadyProcessed = XenditWebhookEvent::query()
                ->where('event_id', $eventId)
                ->lockForUpdate()
                ->exists();

            if ($alreadyProcessed) {
                return Reservation::query()->where('xendit_invoice_id', $invoiceId)->first();
            }

            XenditWebhookEvent::create([
                'event_id' => $eventId,
                'event_type' => $eventType,
                'invoice_id' => $invoiceId,
                'processed_at' => now(),
            ]);

            $reservation = Reservation::query()
                ->where('xendit_invoice_id', $invoiceId)
                ->lockForUpdate()
                ->first();

            if (! $reservation) {
                return null;
            }

            if ($eventType === 'invoice.paid' && $status === 'PAID') {
                if ($reservation->xendit_payment_status === 'paid' && $reservation->status === 'confirmed') {
                    return $reservation->refresh();
                }

                // Auto-create guest account if the reservation has no linked user
                if (! $reservation->client_id) {
                    $guestUser = $this->ensureGuestAccount($payload, $reservation);
                    if ($guestUser) {
                        $reservation->client_id = $guestUser->id;
                    }
                }

                $oldValues = $reservation->only(['status', 'xendit_payment_status', 'client_id']);
                $reservation->update([
                    'xendit_payment_status' => 'paid',
                    'status' => 'confirmed',
                    'client_id' => $reservation->client_id,
                    'reserved_at' => now(),
                ]);

                $this->audits->log(
                    'reservation_payment_confirmed',
                    'reservation',
                    $reservation->id,
                    $oldValues,
                    $reservation->only(['status', 'xendit_payment_status', 'client_id'])
                );

                $reservationForNotifications = $reservation->load(['client', 'resort']);
                DB::afterCommit(function () use ($reservationForNotifications): void {
                    $this->emails->sendBookingConfirmation($reservationForNotifications);
                    $this->emails->sendPaymentReceipt($reservationForNotifications);
                    $this->emails->sendNewBookingToResort($reservationForNotifications);
                });

            } elseif (in_array($status, ['EXPIRED', 'FAILED'], true)) {
                if ($reservation->status === 'expired'
                    && in_array((string) $reservation->xendit_payment_status, ['expired', 'failed'], true)) {
                    return $reservation->refresh();
                }

                $oldValues = $reservation->only(['status', 'xendit_payment_status']);
                $reservation->update([
                    'xendit_payment_status' => strtolower($status),
                    'status' => 'expired',
                ]);

                $this->audits->log(
                    'reservation_payment_failed',
                    'reservation',
                    $reservation->id,
                    $oldValues,
                    $reservation->only(['status', 'xendit_payment_status'])
                );
            }

            return $reservation->refresh();
        });
    }

    /**
     * Ensure a guest User account exists. Xendit passes payer info in payload.
     * Creates the account with a random password if no matching email found.
     */
    private function ensureGuestAccount(array $payload, Reservation $reservation): ?User
    {
        // Xendit invoice payload may contain payer_email or description-embedded info.
        $email = Arr::get($payload, 'payer_email')
            ?? Arr::get($payload, 'customer.email')
            ?? null;

        if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        $existing = User::withoutGlobalScopes()->where('email', $email)->first();
        if ($existing) {
            return $existing;
        }

        $name = Arr::get($payload, 'customer.given_names')
            ?? Arr::get($payload, 'customer.surname')
            ?? 'Guest';

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt(Str::random(24)),
            'role' => 'client',
            'email_verified_at' => now(),
        ]);

        $this->audits->log(
            'guest_account_auto_created',
            'user',
            $user->id,
            null,
            ['email' => $email, 'reservation_id' => $reservation->id]
        );

        return $user;
    }
}
