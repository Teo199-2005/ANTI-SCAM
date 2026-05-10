<?php

namespace App\Modules\Reservations\Services;

use App\Models\BookingLock;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Modules\Audit\Services\AuditLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ReservationService
{
    public function __construct(private readonly AuditLogService $audits) {}

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
                ->first();
            if (! $room) {
                throw new RuntimeException('Selected room is invalid for this booking.');
            }
            if ((int) $room->resort_id !== $resortId) {
                throw new RuntimeException('Selected room does not belong to the chosen resort.');
            }

            $overlapCount = Reservation::query()
                ->where('tenant_id', $tenantId)
                ->where('room_id', $lock->room_id)
                ->whereIn('status', ['pending_payment', 'confirmed'])
                ->where(function ($query) use ($lock): void {
                    $query
                        ->whereBetween('check_in_date', [$lock->check_in_date, $lock->check_out_date])
                        ->orWhereBetween('check_out_date', [$lock->check_in_date, $lock->check_out_date])
                        ->orWhere(function ($q) use ($lock): void {
                            $q->where('check_in_date', '<=', $lock->check_in_date)
                                ->where('check_out_date', '>=', $lock->check_out_date);
                        });
                })
                ->lockForUpdate()
                ->count();

            $units = max(1, (int) ($room->units ?? 1));

            if ($overlapCount >= $units) {
                $lock->update(['status' => 'released']);
                throw new RuntimeException('Room was booked by another transaction. Please choose another date.');
            }

            $reservation = Reservation::create([
                'tenant_id' => $tenantId,
                'resort_id' => $resortId,
                'room_id' => $lock->room_id,
                'client_id' => $payload['client_id'] ?? null,
                'reference_no' => 'RSV-'.strtoupper(Str::random(10)),
                'check_in_date' => $lock->check_in_date->toDateString(),
                'check_out_date' => $lock->check_out_date->toDateString(),
                'guest_count' => (int) ($payload['guest_count'] ?? 1),
                'reservation_fee' => 500.00,
                'total_amount' => (float) ($payload['total_amount'] ?? 0),
                'status' => 'pending_payment',
                'xendit_payment_status' => 'pending',
                'reserved_at' => now(),
            ]);

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

    public function adminOverrideStatus(Reservation $reservation, string $status, string $reason): Reservation
    {
        if (! in_array($status, ['pending_payment', 'confirmed', 'cancelled', 'expired'], true)) {
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
