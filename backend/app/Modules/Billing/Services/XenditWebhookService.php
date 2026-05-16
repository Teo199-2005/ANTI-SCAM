<?php

namespace App\Modules\Billing\Services;

use App\Models\Reservation;
use App\Models\User;
use App\Models\XenditWebhookEvent;
use App\Support\XenditInvoiceWebhookStatus;
use App\Modules\Audit\Services\AuditLogService;
use App\Services\DigitalAcknowledgmentReceiptService;
use App\Services\RoomStayGuard;
use App\Services\EmailNotificationService;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class XenditWebhookService
{
    public function __construct(
        private readonly AuditLogService $audits,
        private readonly EmailNotificationService $emails,
        private readonly DigitalAcknowledgmentReceiptService $digitalReceipts,
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

            if (XenditInvoiceWebhookStatus::isPaid($payload)) {
                if ($reservation->xendit_payment_status === 'paid' && $reservation->status === 'confirmed') {
                    $alreadyPaid = $reservation->load(['client', 'resort', 'room']);
                    DB::afterCommit(function () use ($alreadyPaid): void {
                        $this->emails->sendReservationPaymentNotificationsIfMissing($alreadyPaid);
                    });

                    return $reservation->refresh();
                }

                // Auto-create guest account if the reservation has no linked user
                if (! $reservation->client_id) {
                    $guestUser = $this->ensureGuestAccount($payload, $reservation);
                    if ($guestUser) {
                        $reservation->client_id = $guestUser->id;
                        $this->syncReservationGuestContact($reservation, $guestUser, $payload);
                    }
                } else {
                    $client = User::withoutGlobalScopes()->find($reservation->client_id);
                    $this->syncReservationGuestContact($reservation, $client, $payload);
                }

                $paidMoment = now();
                $ackNo = $reservation->acknowledgment_receipt_no;
                if ($ackNo === null || $ackNo === '') {
                    $ackNo = $this->digitalReceipts->allocate(
                        DigitalAcknowledgmentReceiptService::KIND_BOOKING,
                        $paidMoment
                    );
                }

                $oldValues = $reservation->only(['status', 'xendit_payment_status', 'client_id', 'acknowledgment_receipt_no']);
                $reservation->update([
                    'xendit_payment_status' => 'paid',
                    'status' => 'confirmed',
                    'client_id' => $reservation->client_id,
                    'reserved_at' => $paidMoment,
                    'acknowledgment_receipt_no' => $ackNo,
                ]);

                $this->audits->log(
                    'reservation_payment_confirmed',
                    'reservation',
                    $reservation->id,
                    $oldValues,
                    $reservation->only(['status', 'xendit_payment_status', 'client_id', 'acknowledgment_receipt_no'])
                );

                RoomStayGuard::expireDuplicatePendingForStay($reservation);

                $reservationForNotifications = $reservation->load(['client', 'resort', 'room']);
                DB::afterCommit(function () use ($reservationForNotifications): void {
                    $this->emails->sendReservationPaymentNotifications($reservationForNotifications);
                });

            } elseif (XenditInvoiceWebhookStatus::isExpiredOrFailed($payload)) {
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
        $email = $this->extractPayerEmail($payload);

        if ($email === null) {
            return null;
        }

        $existing = User::withoutGlobalScopes()->where('email', $email)->first();
        if ($existing) {
            return $existing;
        }

        $name = $this->extractPayerName($payload);

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt(Str::random(24)),
            'role' => 'guest',
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

    private function extractPayerEmail(array $payload): ?string
    {
        $candidates = [
            Arr::get($payload, 'payer_email'),
            Arr::get($payload, 'customer.email'),
            Arr::get($payload, 'email'),
        ];

        foreach ($candidates as $email) {
            if (is_string($email) && filter_var(trim($email), FILTER_VALIDATE_EMAIL)) {
                return strtolower(trim($email));
            }
        }

        return null;
    }

    private function extractPayerName(array $payload): string
    {
        $given = trim((string) (Arr::get($payload, 'customer.given_names') ?? ''));
        $family = trim((string) (Arr::get($payload, 'customer.surname') ?? ''));
        $combined = trim($given.' '.$family);

        return $combined !== '' ? $combined : 'Guest';
    }

    private function syncReservationGuestContact(Reservation $reservation, ?User $user, array $payload): void
    {
        $updates = [];
        $email = $user?->email ?? $this->extractPayerEmail($payload);
        if ($email && ! $reservation->guest_email) {
            $updates['guest_email'] = $email;
        }
        $name = $user?->name ?? $this->extractPayerName($payload);
        if ($name !== 'Guest' && ! $reservation->guest_name) {
            $updates['guest_name'] = $name;
        }
        if ($updates !== []) {
            $reservation->update($updates);
        }
    }
}
