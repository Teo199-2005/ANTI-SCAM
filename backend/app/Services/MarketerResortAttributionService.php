<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MarketerResortAttributionService
{
    /**
     * Marketer assigned to this resort via marketer_resorts (referral onboard or admin assign).
     * If multiple rows exist, returns the earliest assignment.
     */
    public function resolveMarketerIdForResort(int $resortId): ?int
    {
        $rows = DB::table('marketer_resorts')
            ->where('resort_id', $resortId)
            ->orderBy('created_at')
            ->orderBy('marketer_id')
            ->pluck('marketer_id');

        if ($rows->isEmpty()) {
            return null;
        }

        if ($rows->count() > 1) {
            Log::warning('Multiple marketers assigned to resort; using earliest assignment.', [
                'resort_id' => $resortId,
                'marketer_ids' => $rows->all(),
            ]);
        }

        return (int) $rows->first();
    }
}
