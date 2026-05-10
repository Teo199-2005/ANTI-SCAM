<?php

namespace App\Modules\Reservations\Services;

use App\Models\BookingLock;
use App\Models\Room;
use App\Services\RoomOccupancyService;
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

            $room = Room::withoutGlobalScopes()
                ->where('id', $roomId)
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->first();
            if (! $room) {
                throw new RuntimeException('Room is invalid for this booking.');
            }

            $units = max(1, (int) ($room->units ?? 1));

            $resCount = RoomOccupancyService::overlappingReservationCount($tenantId, $roomId, $checkIn, $checkOut);
            $lockCount = RoomOccupancyService::overlappingActiveLockCount($tenantId, $roomId, $checkIn, $checkOut);
            $hasBlock = RoomOccupancyService::hasBlockedAvailabilityWindow($roomId, $checkIn, $checkOut);

            if ($hasBlock || ($resCount + $lockCount) >= $units) {
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
