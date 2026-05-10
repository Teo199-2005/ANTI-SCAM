<?php

namespace App\Services;

use App\Models\BookingLock;
use App\Models\Reservation;
use App\Models\RoomAvailability;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Parallel booking slots per room row ("units") vs overlapping reservations, locks, and admin blocks.
 */
class RoomOccupancyService
{
    /** Overlap predicate matching reservation/lock availability queries (inclusive date ranges). */
    public static function applyDateOverlap(Builder $query, string $checkIn, string $checkOut): void
    {
        $query->where(function ($q) use ($checkIn, $checkOut): void {
            $q->whereBetween('check_in_date', [$checkIn, $checkOut])
                ->orWhereBetween('check_out_date', [$checkIn, $checkOut])
                ->orWhere(function ($inner) use ($checkIn, $checkOut): void {
                    $inner->where('check_in_date', '<=', $checkIn)
                        ->where('check_out_date', '>=', $checkOut);
                });
        });
    }

    public static function overlappingReservationCount(int $tenantId, int $roomId, string $checkIn, string $checkOut): int
    {
        return Reservation::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('room_id', $roomId)
            ->whereIn('status', ['pending_payment', 'confirmed'])
            ->where(function ($q) use ($checkIn, $checkOut): void {
                self::applyDateOverlap($q, $checkIn, $checkOut);
            })
            ->count();
    }

    /**
     * Active locks overlapping the window (optionally exclude one lock row, e.g. when upgrading same lock).
     */
    public static function overlappingActiveLockCount(
        int $tenantId,
        int $roomId,
        string $checkIn,
        string $checkOut,
        ?int $excludeLockId = null,
    ): int {
        $q = BookingLock::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('room_id', $roomId)
            ->where('status', 'locked')
            ->where('expires_at', '>', now())
            ->where(function ($inner) use ($checkIn, $checkOut): void {
                self::applyDateOverlap($inner, $checkIn, $checkOut);
            });

        if ($excludeLockId !== null) {
            $q->where('id', '!=', $excludeLockId);
        }

        return $q->count();
    }

    /**
     * Admin-blocked or maintenance windows overlapping the guest date range.
     */
    public static function hasBlockedAvailabilityWindow(int $roomId, string $checkIn, string $checkOut): bool
    {
        return RoomAvailability::withoutGlobalScopes()
            ->where('room_id', $roomId)
            ->whereIn('status', ['blocked', 'maintenance'])
            ->where(function ($q) use ($checkIn, $checkOut): void {
                $q->whereBetween('start_date', [$checkIn, $checkOut])
                    ->orWhereBetween('end_date', [$checkIn, $checkOut])
                    ->orWhere(function ($inner) use ($checkIn, $checkOut): void {
                        $inner->where('start_date', '<=', $checkIn)
                            ->where('end_date', '>=', $checkOut);
                    });
            })
            ->exists();
    }

    /**
     * Maximum concurrent reservations on any night (same overlap definition as booking queries).
     */
    public static function maxConcurrentReservationDepth(int $roomId): int
    {
        $rows = Reservation::withoutGlobalScopes()
            ->where('room_id', $roomId)
            ->whereIn('status', ['pending_payment', 'confirmed'])
            ->get(['check_in_date', 'check_out_date']);

        if ($rows->isEmpty()) {
            return 0;
        }

        $days = [];
        foreach ($rows as $r) {
            $in = $r->check_in_date instanceof CarbonInterface
                ? $r->check_in_date->toDateString()
                : (string) $r->check_in_date;
            $out = $r->check_out_date instanceof CarbonInterface
                ? $r->check_out_date->toDateString()
                : (string) $r->check_out_date;
            $days[$in] = true;
            $days[$out] = true;
        }

        $max = 0;
        foreach (array_keys($days) as $day) {
            $n = 0;
            foreach ($rows as $r) {
                $in = $r->check_in_date instanceof CarbonInterface
                    ? $r->check_in_date->toDateString()
                    : (string) $r->check_in_date;
                $out = $r->check_out_date instanceof CarbonInterface
                    ? $r->check_out_date->toDateString()
                    : (string) $r->check_out_date;
                if ($day >= $in && $day <= $out) {
                    $n++;
                }
            }
            $max = max($max, $n);
        }

        return $max;
    }
}
