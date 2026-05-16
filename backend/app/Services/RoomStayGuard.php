<?php

namespace App\Services;

use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Single source of truth for "can this room accept another booking for these dates?"
 */
final class RoomStayGuard
{
    public static function unitsForRoom(Room $room): int
    {
        return max(1, (int) ($room->units ?? 1));
    }

    /**
     * @throws RuntimeException when the stay cannot be booked
     */
    public static function assertCanBook(
        int $tenantId,
        int $roomId,
        string $checkIn,
        string $checkOut,
        int $units,
        ?int $excludeLockId = null,
        ?int $excludeReservationId = null,
    ): void {
        if (RoomOccupancyService::hasBlockedAvailabilityWindow($roomId, $checkIn, $checkOut)) {
            throw new RuntimeException('This room is not available for the selected dates.');
        }

        $resCount = self::overlappingReservationCount(
            $tenantId,
            $roomId,
            $checkIn,
            $checkOut,
            $excludeReservationId
        );
        $lockCount = RoomOccupancyService::overlappingActiveLockCount(
            $tenantId,
            $roomId,
            $checkIn,
            $checkOut,
            $excludeLockId
        );

        if (($resCount + $lockCount) >= $units) {
            throw new RuntimeException('Room is unavailable for the selected date range.');
        }
    }

    public static function overlappingReservationCount(
        int $tenantId,
        int $roomId,
        string $checkIn,
        string $checkOut,
        ?int $excludeReservationId = null,
    ): int {
        $q = Reservation::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('room_id', $roomId)
            ->whereIn('status', ['pending_payment', 'confirmed'])
            ->where(function ($query) use ($checkIn, $checkOut): void {
                RoomOccupancyService::applyDateOverlap($query, $checkIn, $checkOut);
            });

        if ($excludeReservationId !== null) {
            $q->where('id', '!=', $excludeReservationId);
        }

        return $q->count();
    }

    /**
     * When a stay is confirmed, drop any other pending_payment rows for the same room + dates.
     */
    public static function expireDuplicatePendingForStay(Reservation $keep): void
    {
        $checkIn = $keep->check_in_date instanceof \DateTimeInterface
            ? $keep->check_in_date->format('Y-m-d')
            : (string) $keep->check_in_date;
        $checkOut = $keep->check_out_date instanceof \DateTimeInterface
            ? $keep->check_out_date->format('Y-m-d')
            : (string) $keep->check_out_date;

        Reservation::withoutGlobalScopes()
            ->where('tenant_id', $keep->tenant_id)
            ->where('room_id', $keep->room_id)
            ->whereDate('check_in_date', $checkIn)
            ->whereDate('check_out_date', $checkOut)
            ->where('status', 'pending_payment')
            ->where('id', '!=', $keep->id)
            ->update([
                'status' => 'expired',
                'xendit_payment_status' => 'expired',
            ]);
    }

    /**
     * Safety net: if multiple pending rows exist for the same slot (legacy race), keep the newest only.
     */
    public static function collapseDuplicatePendingStays(): int
    {
        $groups = Reservation::withoutGlobalScopes()
            ->select('tenant_id', 'room_id', 'check_in_date', 'check_out_date', DB::raw('COUNT(*) as c'))
            ->where('status', 'pending_payment')
            ->groupBy('tenant_id', 'room_id', 'check_in_date', 'check_out_date')
            ->having('c', '>', 1)
            ->get();

        $expired = 0;
        foreach ($groups as $group) {
            $rows = Reservation::withoutGlobalScopes()
                ->where('tenant_id', $group->tenant_id)
                ->where('room_id', $group->room_id)
                ->whereDate('check_in_date', $group->check_in_date)
                ->whereDate('check_out_date', $group->check_out_date)
                ->where('status', 'pending_payment')
                ->orderByDesc('id')
                ->get();

            foreach ($rows->slice(1) as $dup) {
                $dup->update([
                    'status' => 'expired',
                    'xendit_payment_status' => 'expired',
                ]);
                $expired++;
            }
        }

        return $expired;
    }

    /**
     * Expire pending stays that overlap a confirmed booking (should never happen after guards).
     */
    public static function expirePendingOverlappingConfirmed(): int
    {
        $confirmed = Reservation::withoutGlobalScopes()
            ->where('status', 'confirmed')
            ->get(['id', 'tenant_id', 'room_id', 'check_in_date', 'check_out_date']);

        $expired = 0;
        foreach ($confirmed as $stay) {
            $checkIn = $stay->check_in_date instanceof \DateTimeInterface
                ? $stay->check_in_date->format('Y-m-d')
                : (string) $stay->check_in_date;
            $checkOut = $stay->check_out_date instanceof \DateTimeInterface
                ? $stay->check_out_date->format('Y-m-d')
                : (string) $stay->check_out_date;

            $n = Reservation::withoutGlobalScopes()
                ->where('tenant_id', $stay->tenant_id)
                ->where('room_id', $stay->room_id)
                ->where('status', 'pending_payment')
                ->where('id', '!=', $stay->id)
                ->where(function ($q) use ($checkIn, $checkOut): void {
                    RoomOccupancyService::applyDateOverlap($q, $checkIn, $checkOut);
                })
                ->update([
                    'status' => 'expired',
                    'xendit_payment_status' => 'expired',
                ]);
            $expired += $n;
        }

        return $expired;
    }
}
