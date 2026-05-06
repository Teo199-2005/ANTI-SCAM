<?php

namespace App\Modules\Reservations\Services;

use App\Models\BookingLock;
use App\Models\Reservation;
use App\Models\RoomAvailability;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class BookingLockService
{
    public function createLock(array $payload): BookingLock
    {
        return DB::transaction(function () use ($payload) {
            $tenantId = (int) $payload['tenant_id'];
            $roomId   = (int) $payload['room_id'];
            $checkIn  = $payload['check_in_date'];
            $checkOut = $payload['check_out_date'];

            // Release stale expired locks for this room
            BookingLock::query()
                ->where('tenant_id', $tenantId)
                ->where('room_id', $roomId)
                ->where('status', 'locked')
                ->where('expires_at', '<', now())
                ->update(['status' => 'released']);

            // Date-range conflict closure (reused across three checks)
            $dateConflict = function ($query) use ($checkIn, $checkOut): void {
                $query->where(function ($q) use ($checkIn, $checkOut): void {
                    $q->whereBetween('check_in_date', [$checkIn, $checkOut])
                        ->orWhereBetween('check_out_date', [$checkIn, $checkOut])
                        ->orWhere(function ($inner) use ($checkIn, $checkOut): void {
                            $inner->where('check_in_date', '<=', $checkIn)
                                  ->where('check_out_date', '>=', $checkOut);
                        });
                });
            };

            // 1. Confirmed / pending reservation conflict
            $hasReservationConflict = Reservation::query()
                ->where('tenant_id', $tenantId)
                ->where('room_id', $roomId)
                ->whereIn('status', ['pending_payment', 'confirmed'])
                ->tap($dateConflict)
                ->lockForUpdate()
                ->exists();

            // 2. Active booking lock conflict
            $hasLockConflict = BookingLock::query()
                ->where('tenant_id', $tenantId)
                ->where('room_id', $roomId)
                ->where('status', 'locked')
                ->where('expires_at', '>', now())
                ->tap($dateConflict)
                ->lockForUpdate()
                ->exists();

            // 3. Admin-blocked availability window conflict
            $hasAvailabilityBlock = RoomAvailability::query()
                ->where('room_id', $roomId)
                ->where('is_available', false)
                ->tap($dateConflict)
                ->lockForUpdate()
                ->exists();

            if ($hasReservationConflict || $hasLockConflict || $hasAvailabilityBlock) {
                throw new RuntimeException('Room is unavailable for the selected date range.');
            }

            return BookingLock::create([
                'tenant_id'      => $tenantId,
                'room_id'        => $roomId,
                'lock_token'     => (string) Str::uuid(),
                'check_in_date'  => $checkIn,
                'check_out_date' => $checkOut,
                'expires_at'     => now()->addMinutes(10),
                'status'         => 'locked',
            ]);
        });
    }
}
