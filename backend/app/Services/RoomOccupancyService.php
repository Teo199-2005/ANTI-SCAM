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
    /**
     * Stay interval overlap for date-only check-in / check-out (check-out day is departure, not another occupied night).
     */
    public static function applyDateOverlap(Builder $query, string $checkIn, string $checkOut): void
    {
        $query->where('check_in_date', '<', $checkOut)
            ->where('check_out_date', '>', $checkIn);
    }

    public static function oneNightStartAvailable(
        int $tenantId,
        int $roomId,
        string $nightStartIso,
        int $units,
    ): bool {
        $checkOut = \Carbon\Carbon::parse($nightStartIso)->addDay()->toDateString();

        return self::stayWindowHasCapacity($tenantId, $roomId, $nightStartIso, $checkOut, $units);
    }

    /**
     * Month heatmap in a few queries (used by public availability calendar).
     *
     * @return array<string, 'past'|'free'|'busy'>
     */
    public static function buildMonthOneNightStartMap(
        int $tenantId,
        int $roomId,
        int $year,
        int $month,
        int $units,
    ): array {
        $daysInMonth = (int) \Carbon\Carbon::create($year, $month, 1)->daysInMonth;
        $today = now()->toDateString();
        $monthStart = sprintf('%04d-%02d-%02d', $year, $month, 1);
        $windowEnd = \Carbon\Carbon::create($year, $month, $daysInMonth)->addDay()->toDateString();

        $reservations = Reservation::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('room_id', $roomId)
            ->occupyingInventory()
            ->where('check_in_date', '<', $windowEnd)
            ->where('check_out_date', '>', $monthStart)
            ->get(['check_in_date', 'check_out_date']);

        $locks = BookingLock::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('room_id', $roomId)
            ->where('status', 'locked')
            ->where('expires_at', '>', now())
            ->where('check_in_date', '<', $windowEnd)
            ->where('check_out_date', '>', $monthStart)
            ->get(['check_in_date', 'check_out_date']);

        $blocks = RoomAvailability::withoutGlobalScopes()
            ->where('room_id', $roomId)
            ->whereIn('status', ['blocked', 'maintenance'])
            ->where('start_date', '<', $windowEnd)
            ->where('end_date', '>', $monthStart)
            ->get(['start_date', 'end_date']);

        $days = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $iso = sprintf('%04d-%02d-%02d', $year, $month, $d);
            if ($iso < $today) {
                $days[$iso] = 'past';

                continue;
            }
            $nightEnd = \Carbon\Carbon::parse($iso)->addDay()->toDateString();
            $days[$iso] = self::stayWindowHasCapacityFromRows(
                $reservations,
                $locks,
                $blocks,
                $iso,
                $nightEnd,
                $units,
            ) ? 'free' : 'busy';
        }

        // Guest calendar: highlight each booked date from check-in through check-out (inclusive).
        foreach (array_keys($days) as $iso) {
            if ($days[$iso] === 'past') {
                continue;
            }
            foreach ($reservations as $row) {
                $in = self::dateToIso($row->check_in_date);
                $out = self::dateToIso($row->check_out_date);
                if ($in <= $iso && $iso <= $out) {
                    $days[$iso] = 'busy';
                    break;
                }
            }
        }

        return $days;
    }

    public static function stayWindowHasCapacity(
        int $tenantId,
        int $roomId,
        string $checkIn,
        string $checkOut,
        int $units,
    ): bool {
        if (self::hasBlockedAvailabilityWindow($roomId, $checkIn, $checkOut)) {
            return false;
        }

        $resCount = self::overlappingReservationCount($tenantId, $roomId, $checkIn, $checkOut);
        $lockCount = self::overlappingActiveLockCount($tenantId, $roomId, $checkIn, $checkOut);

        return ($resCount + $lockCount) < $units;
    }

    /**
     * @param  iterable<Reservation|BookingLock>  $stays
     * @param  iterable<RoomAvailability>  $blocks
     */
    private static function stayWindowHasCapacityFromRows(
        iterable $stays,
        iterable $locks,
        iterable $blocks,
        string $checkIn,
        string $checkOut,
        int $units,
    ): bool {
        if (self::anyBlockOverlaps($blocks, $checkIn, $checkOut)) {
            return false;
        }

        $held = 0;
        foreach ($stays as $row) {
            if (self::dateRangesOverlap(
                self::dateToIso($row->check_in_date),
                self::dateToIso($row->check_out_date),
                $checkIn,
                $checkOut,
            )) {
                $held++;
            }
        }
        foreach ($locks as $row) {
            if (self::dateRangesOverlap(
                self::dateToIso($row->check_in_date),
                self::dateToIso($row->check_out_date),
                $checkIn,
                $checkOut,
            )) {
                $held++;
            }
        }

        return $held < $units;
    }

    /** @param  iterable<RoomAvailability>  $blocks */
    private static function anyBlockOverlaps(iterable $blocks, string $checkIn, string $checkOut): bool
    {
        foreach ($blocks as $block) {
            $start = self::dateToIso($block->start_date);
            $end = self::dateToIso($block->end_date);
            if ($start <= $checkOut && $end >= $checkIn) {
                return true;
            }
        }

        return false;
    }

    public static function dateRangesOverlap(string $stayIn, string $stayOut, string $windowIn, string $windowOut): bool
    {
        return $stayIn < $windowOut && $stayOut > $windowIn;
    }

    private static function dateToIso(mixed $value): string
    {
        if ($value instanceof CarbonInterface) {
            return $value->toDateString();
        }

        return substr((string) $value, 0, 10);
    }

    public static function overlappingReservationCount(int $tenantId, int $roomId, string $checkIn, string $checkOut): int
    {
        return Reservation::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('room_id', $roomId)
            ->occupyingInventory()
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
            ->occupyingInventory()
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
