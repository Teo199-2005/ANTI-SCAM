<?php

namespace App\Modules\Reservations\Services;

use App\Models\BookingLock;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\SystemSetting;
use App\Models\User;
use App\Modules\Audit\Services\AuditLogService;
use App\Services\RoomStayGuard;
use App\Support\PricingPilot;
use DateTimeInterface;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ReservationService
{
    public function __construct(private readonly AuditLogService $audits) {}

    /** Fixed guest reservation fee (PHP), from `system_settings` or config fallback. */
    public static function reservationFeeAmount(): float
    {
        if (PricingPilot::enabled()) {
            return PricingPilot::unit();
        }

        $raw = SystemSetting::getValue('reservation_fee');
        if ($raw !== null && is_numeric($raw)) {
            return max(0, (float) $raw);
        }

        return max(0, (float) config('reservations.default_reservation_fee', 500));
    }

    /**
     * Count reservations that block a new stay for the same room (pending_payment + confirmed).
     */
    public function countBlockingOverlaps(
        int $tenantId,
        int $roomId,
        DateTimeInterface|string $checkIn,
        DateTimeInterface|string $checkOut,
        ?int $excludeReservationId = null,
    ): int {
        $checkInStr = $checkIn instanceof DateTimeInterface
            ? $checkIn->format('Y-m-d')
            : (string) $checkIn;
        $checkOutStr = $checkOut instanceof DateTimeInterface
            ? $checkOut->format('Y-m-d')
            : (string) $checkOut;

        return RoomStayGuard::overlappingReservationCount(
            $tenantId,
            $roomId,
            $checkInStr,
            $checkOutStr,
            $excludeReservationId
        );
    }

    public function createFromLock(array $payload): Reservation
    {
        return DB::transaction(function () use ($payload) {
            $lockToken = (string) $payload['lock_token'];
            $resortId = (int) $payload['resort_id'];

            $lock = BookingLock::query()
                ->where('lock_token', $lockToken)
                ->lockForUpdate()
                ->first();

            if (! $lock) {
                throw new RuntimeException('Invalid lock token.');
            }

            $tenantId = (int) $lock->tenant_id;
            if ($lock->status !== 'locked') {
                throw new RuntimeException('This lock is no longer active.');
            }

            if ($lock->expires_at->isPast()) {
                $lock->update(['status' => 'released']);
                throw new RuntimeException('This lock has expired. Please reserve again.');
            }

            $resort = Resort::withoutGlobalScopes()
                ->where('id', $resortId)
                ->where('tenant_id', $tenantId)
                ->first();
            if (! $resort) {
                throw new RuntimeException('Selected resort is invalid for this booking.');
            }

            $room = Room::withoutGlobalScopes()
                ->where('id', $lock->room_id)
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->first();
            if (! $room) {
                throw new RuntimeException('Selected room is invalid for this booking.');
            }
            if ((int) $room->resort_id !== $resortId) {
                throw new RuntimeException('Selected room does not belong to the chosen resort.');
            }

            $existingForLock = Reservation::query()
                ->where('booking_lock_id', $lock->id)
                ->lockForUpdate()
                ->first();
            if ($existingForLock) {
                if ($lock->status === 'locked') {
                    $lock->update(['status' => 'converted']);
                }

                return $existingForLock->refresh();
            }

            $checkInStr = $lock->check_in_date->toDateString();
            $checkOutStr = $lock->check_out_date->toDateString();
            $clientId = isset($payload['client_id']) ? (int) $payload['client_id'] : null;

            $pendingForStay = Reservation::query()
                ->where('tenant_id', $tenantId)
                ->where('room_id', $lock->room_id)
                ->whereDate('check_in_date', $checkInStr)
                ->whereDate('check_out_date', $checkOutStr)
                ->where('status', 'pending_payment')
                ->lockForUpdate()
                ->orderByDesc('id')
                ->get();

            if ($pendingForStay->isNotEmpty()) {
                $reuse = $clientId
                    ? $pendingForStay->firstWhere('client_id', $clientId)
                    : null;
                if ($reuse) {
                    $lock->update(['status' => 'released']);

                    return $reuse->refresh();
                }

                $lock->update(['status' => 'released']);
                throw new RuntimeException(
                    'These dates are already held pending payment. Complete or cancel the existing checkout before booking again.'
                );
            }

            try {
                RoomStayGuard::assertCanBook(
                    $tenantId,
                    (int) $lock->room_id,
                    $checkInStr,
                    $checkOutStr,
                    RoomStayGuard::unitsForRoom($room),
                    (int) $lock->id,
                );
            } catch (RuntimeException $e) {
                $lock->update(['status' => 'released']);
                throw $e;
            }

            try {
                $reservation = Reservation::create([
                    'tenant_id' => $tenantId,
                    'resort_id' => $resortId,
                    'room_id' => $lock->room_id,
                    'booking_lock_id' => $lock->id,
                    'client_id' => $payload['client_id'] ?? null,
                    'booking_source' => 'online',
                    'reference_no' => 'RSV-'.strtoupper(Str::random(10)),
                    'check_in_date' => $lock->check_in_date->toDateString(),
                    'check_out_date' => $lock->check_out_date->toDateString(),
                    'guest_count' => (int) ($payload['guest_count'] ?? 1),
                    'reservation_fee' => self::reservationFeeAmount(),
                    'total_amount' => (float) ($payload['total_amount'] ?? 0),
                    'status' => 'pending_payment',
                    'xendit_payment_status' => 'pending',
                    'reserved_at' => now(),
                ]);
            } catch (QueryException $e) {
                if (str_contains(strtolower($e->getMessage()), 'unique') && str_contains($e->getMessage(), 'booking_lock_id')) {
                    $existing = Reservation::query()->where('booking_lock_id', $lock->id)->first();
                    if ($existing) {
                        $lock->update(['status' => 'converted']);

                        return $existing->refresh();
                    }
                }
                throw $e;
            }

            $lock->update(['status' => 'converted']);

            $this->audits->log(
                'reservation_created_from_lock',
                'reservation',
                $reservation->id,
                null,
                $reservation->only(['status', 'reservation_fee', 'xendit_payment_status']),
                ['lock_token' => $lockToken]
            );

            return $reservation->refresh();
        });
    }

    public function createManualForResort(User $owner, array $validated): Reservation
    {
        return DB::transaction(function () use ($owner, $validated) {
            $tenantId = (int) $owner->tenant_id;
            $resortId = (int) $validated['resort_id'];
            $roomId = (int) $validated['room_id'];

            $resort = Resort::withoutGlobalScopes()
                ->where('id', $resortId)
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->first();
            if (! $resort) {
                throw new RuntimeException('Resort not found for your account.');
            }

            $room = Room::withoutGlobalScopes()
                ->where('id', $roomId)
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->first();
            if (! $room || (int) $room->resort_id !== $resortId) {
                throw new RuntimeException('Room does not belong to this resort.');
            }

            $checkIn = (string) $validated['check_in_date'];
            $checkOut = (string) $validated['check_out_date'];

            $overlapCount = $this->countBlockingOverlaps($tenantId, $roomId, $checkIn, $checkOut, null);
            $units = max(1, (int) ($room->units ?? 1));
            if ($overlapCount >= $units) {
                throw new RuntimeException('Those dates overlap an existing booking for this room.');
            }

            $fee = array_key_exists('reservation_fee', $validated) && $validated['reservation_fee'] !== null
                ? (float) $validated['reservation_fee']
                : self::reservationFeeAmount();

            $reservation = Reservation::create([
                'tenant_id' => $tenantId,
                'resort_id' => $resortId,
                'room_id' => $roomId,
                'client_id' => null,
                'booking_source' => 'manual',
                'guest_name' => (string) $validated['guest_name'],
                'guest_email' => isset($validated['guest_email']) ? (string) $validated['guest_email'] : null,
                'guest_phone' => isset($validated['guest_phone']) ? (string) $validated['guest_phone'] : null,
                'reference_no' => 'RSV-'.strtoupper(Str::random(10)),
                'check_in_date' => $checkIn,
                'check_out_date' => $checkOut,
                'guest_count' => (int) $validated['guest_count'],
                'reservation_fee' => max(0, $fee),
                'total_amount' => (float) $validated['total_amount'],
                'status' => 'confirmed',
                'xendit_invoice_id' => null,
                'xendit_payment_status' => 'paid',
                'reserved_at' => now(),
            ]);

            $this->audits->log(
                'reservation_created_manual',
                'reservation',
                $reservation->id,
                null,
                $reservation->only(['status', 'booking_source', 'reservation_fee', 'xendit_payment_status']),
                []
            );

            return $reservation->refresh();
        });
    }

    public function updateManual(Reservation $reservation, User $owner, array $validated): Reservation
    {
        if (($reservation->booking_source ?? 'online') !== 'manual') {
            throw new RuntimeException('Only manual reservations can be edited here.');
        }
        if ($reservation->status !== 'confirmed') {
            throw new RuntimeException('Only confirmed manual reservations can be edited.');
        }
        if ($reservation->check_out_date->toDateString() < now()->toDateString()) {
            throw new RuntimeException('Cannot edit a reservation after check-out.');
        }

        return DB::transaction(function () use ($reservation, $owner, $validated) {
            $tenantId = (int) $owner->tenant_id;
            if ((int) $reservation->tenant_id !== $tenantId) {
                throw new RuntimeException('Reservation does not belong to your resort.');
            }

            $resortId = (int) $reservation->resort_id;
            $roomId = array_key_exists('room_id', $validated)
                ? (int) $validated['room_id']
                : (int) $reservation->room_id;

            $room = Room::withoutGlobalScopes()
                ->where('id', $roomId)
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->first();
            if (! $room || (int) $room->resort_id !== $resortId) {
                throw new RuntimeException('Room does not belong to this resort.');
            }

            $checkIn = array_key_exists('check_in_date', $validated)
                ? (string) $validated['check_in_date']
                : $reservation->check_in_date->toDateString();
            $checkOut = array_key_exists('check_out_date', $validated)
                ? (string) $validated['check_out_date']
                : $reservation->check_out_date->toDateString();

            $overlapCount = $this->countBlockingOverlaps($tenantId, $roomId, $checkIn, $checkOut, (int) $reservation->id);
            $units = max(1, (int) ($room->units ?? 1));
            if ($overlapCount >= $units) {
                throw new RuntimeException('Those dates overlap an existing booking for this room.');
            }

            $oldValues = $reservation->only([
                'room_id', 'check_in_date', 'check_out_date', 'guest_count', 'guest_name', 'guest_email', 'guest_phone',
                'total_amount', 'reservation_fee',
            ]);

            $updates = [
                'room_id' => $roomId,
                'check_in_date' => $checkIn,
                'check_out_date' => $checkOut,
            ];
            if (array_key_exists('guest_name', $validated)) {
                $updates['guest_name'] = (string) $validated['guest_name'];
            }
            if (array_key_exists('guest_email', $validated)) {
                $updates['guest_email'] = $validated['guest_email'] !== null && $validated['guest_email'] !== ''
                    ? (string) $validated['guest_email']
                    : null;
            }
            if (array_key_exists('guest_phone', $validated)) {
                $updates['guest_phone'] = $validated['guest_phone'] !== null && $validated['guest_phone'] !== ''
                    ? (string) $validated['guest_phone']
                    : null;
            }
            if (array_key_exists('guest_count', $validated)) {
                $updates['guest_count'] = (int) $validated['guest_count'];
            }
            if (array_key_exists('total_amount', $validated)) {
                $updates['total_amount'] = (float) $validated['total_amount'];
            }
            if (array_key_exists('reservation_fee', $validated)) {
                $updates['reservation_fee'] = $validated['reservation_fee'] !== null
                    ? max(0, (float) $validated['reservation_fee'])
                    : $reservation->reservation_fee;
            }

            $reservation->update($updates);

            $this->audits->log(
                'reservation_updated_manual',
                'reservation',
                $reservation->id,
                $oldValues,
                $reservation->only([
                    'room_id', 'check_in_date', 'check_out_date', 'guest_count', 'guest_name', 'guest_email', 'guest_phone',
                    'total_amount', 'reservation_fee',
                ]),
                []
            );

            return $reservation->refresh();
        });
    }

    public function cancelByResort(Reservation $reservation, ?string $reason = null): Reservation
    {
        if (($reservation->booking_source ?? 'online') !== 'manual') {
            throw new RuntimeException('Only manual reservations can be cancelled this way.');
        }
        if (! in_array($reservation->status, ['pending_payment', 'confirmed'], true)) {
            throw new RuntimeException('Reservation is not eligible for cancellation.');
        }

        $oldValues = $reservation->only(['status', 'refund_status']);
        $reservation->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
            'refund_status' => config('reservations.reservation_fee_non_refundable', true)
                ? 'non_refundable_fee_retained'
                : 'refunded',
        ]);

        $this->audits->log(
            'reservation_cancelled_by_resort',
            'reservation',
            $reservation->id,
            $oldValues,
            $reservation->only(['status', 'refund_status']),
            ['reason' => $reason]
        );

        return $reservation->refresh();
    }

    /**
     * Cancel pending or confirmed reservations when a guest is removed from the directory.
     * Applies to manual and online bookings (unlike {@see cancelByResort}).
     */
    public function cancelForGuestRemoval(Reservation $reservation, ?string $reason = null): Reservation
    {
        if (! in_array($reservation->status, Reservation::CANCELLABLE_STATUSES, true)) {
            throw new RuntimeException('Reservation is not eligible for cancellation.');
        }

        $oldValues = $reservation->only(['status', 'refund_status']);
        $reservation->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason ?? 'Guest removed from directory',
            'refund_status' => config('reservations.reservation_fee_non_refundable', true)
                ? 'non_refundable_fee_retained'
                : 'refunded',
        ]);

        $this->audits->log(
            'reservation_cancelled_guest_removed',
            'reservation',
            $reservation->id,
            $oldValues,
            $reservation->only(['status', 'refund_status']),
            ['reason' => $reason ?? 'Guest removed from directory']
        );

        return $reservation->refresh();
    }

    public function cancelByClient(Reservation $reservation, int $clientId, ?string $reason = null): Reservation
    {
        if ($reservation->client_id !== $clientId) {
            throw new RuntimeException('You can only cancel your own reservation.');
        }

        if (! in_array($reservation->status, ['pending_payment', 'confirmed'], true)) {
            throw new RuntimeException('Reservation is not eligible for cancellation.');
        }

        $minHours = (int) config('reservations.client_cancel_min_hours', 24);
        $hoursToCheckIn = now()->diffInHours($reservation->check_in_date, false);
        if ($hoursToCheckIn < $minHours) {
            throw new RuntimeException("Cancellation is allowed only {$minHours} hours before check-in.");
        }

        $oldValues = $reservation->only(['status', 'refund_status']);
        $reservation->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
            'refund_status' => config('reservations.reservation_fee_non_refundable', true)
                ? 'non_refundable_fee_retained'
                : 'refunded',
        ]);

        $this->audits->log(
            'reservation_cancelled_by_client',
            'reservation',
            $reservation->id,
            $oldValues,
            $reservation->only(['status', 'refund_status']),
            ['reason' => $reason]
        );

        return $reservation->refresh();
    }

    public function markCompletedByResort(Reservation $reservation): Reservation
    {
        if ($reservation->status !== 'confirmed') {
            throw new RuntimeException('Only confirmed reservations can be marked as completed.');
        }
        if ($reservation->check_in_date->isFuture()) {
            throw new RuntimeException('Cannot mark completed before the check-in date.');
        }

        $oldValues = $reservation->only(['status']);
        $reservation->update(['status' => 'completed']);

        $this->audits->log(
            'reservation_marked_completed',
            'reservation',
            $reservation->id,
            $oldValues,
            $reservation->only(['status']),
        );

        return $reservation->refresh();
    }

    public function markNoShowByResort(Reservation $reservation): Reservation
    {
        if ($reservation->status !== 'confirmed') {
            throw new RuntimeException('Only confirmed reservations can be marked as no-show.');
        }
        if ($reservation->check_in_date->isFuture()) {
            throw new RuntimeException('Cannot mark no-show before the check-in date.');
        }

        $oldValues = $reservation->only(['status']);
        $reservation->update(['status' => 'no_show']);

        $this->audits->log(
            'reservation_marked_no_show',
            'reservation',
            $reservation->id,
            $oldValues,
            $reservation->only(['status']),
        );

        return $reservation->refresh();
    }

    public function adminOverrideStatus(Reservation $reservation, string $status, string $reason): Reservation
    {
        if (! in_array($status, ['pending_payment', 'confirmed', 'cancelled', 'expired', 'no_show', 'completed'], true)) {
            throw new RuntimeException('Invalid override status.');
        }

        $oldValues = $reservation->only(['status']);
        $reservation->update(['status' => $status]);

        $this->audits->log(
            'reservation_admin_override',
            'reservation',
            $reservation->id,
            $oldValues,
            $reservation->only(['status']),
            ['reason' => $reason]
        );

        return $reservation->refresh();
    }
}
