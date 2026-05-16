<?php

namespace App\Services;

use App\Models\Room;
use App\Models\RoomDailyRate;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class RoomDailyRateService
{
    /**
     * @return array<string, float> map Y-m-d => nightly_price
     */
    public function ratesForMonth(Room $room, int $year, int $month): array
    {
        $start = Carbon::create($year, $month, 1)->startOfMonth()->toDateString();
        $end = Carbon::create($year, $month, 1)->endOfMonth()->toDateString();

        return RoomDailyRate::query()
            ->where('room_id', $room->id)
            ->whereBetween('date', [$start, $end])
            ->get()
            ->mapWithKeys(fn (RoomDailyRate $row): array => [
                $row->date->toDateString() => (float) $row->nightly_price,
            ])
            ->all();
    }

    public function resolveNightlyPrice(Room $room, string $ymd): float
    {
        $override = RoomDailyRate::query()
            ->where('room_id', $room->id)
            ->whereDate('date', $ymd)
            ->value('nightly_price');

        if ($override !== null) {
            return round((float) $override, 2);
        }

        return round((float) $room->base_price, 2);
    }

    /**
     * @param  list<string>  $dates  Y-m-d
     */
    public function upsertDates(Room $room, array $dates, float $nightlyPrice): void
    {
        $base = round((float) $room->base_price, 2);
        $price = round(max(0, $nightlyPrice), 2);
        $unique = array_values(array_unique($dates));

        foreach ($unique as $ymd) {
            if ($price === $base) {
                RoomDailyRate::query()
                    ->where('room_id', $room->id)
                    ->whereDate('date', $ymd)
                    ->delete();

                continue;
            }

            RoomDailyRate::query()->updateOrCreate(
                [
                    'room_id' => $room->id,
                    'date' => $ymd,
                ],
                [
                    'tenant_id' => $room->tenant_id,
                    'nightly_price' => $price,
                ],
            );
        }
    }

    /**
     * @return Collection<int, RoomDailyRate>
     */
    public function forDateRange(Room $room, string $start, string $end): Collection
    {
        return RoomDailyRate::query()
            ->where('room_id', $room->id)
            ->whereBetween('date', [$start, $end])
            ->get();
    }
}
