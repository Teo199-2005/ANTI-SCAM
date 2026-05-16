<?php

namespace App\Modules\Reservations\Services;

use App\Models\BookingLock;
use App\Models\Room;
use App\Services\RoomStayGuard;
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

            RoomStayGuard::assertCanBook(
                $tenantId,
                $roomId,
                (string) $checkIn,
                (string) $checkOut,
                RoomStayGuard::unitsForRoom($room),
            );

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
