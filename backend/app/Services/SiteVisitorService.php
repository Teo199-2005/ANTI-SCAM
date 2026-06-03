<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Resort;
use App\Models\SiteVisitor;

final class SiteVisitorService
{
    /**
     * Record a visit. Determines uniqueness based on session_id + page_url + date.
     */
    public function recordVisit(array $data): SiteVisitor
    {
        $sessionId = $data['session_id'] ?? '';
        $pageUrl = $data['page_url'] ?? '';
        $today = now()->toDateString();

        // Check if this session has already visited this page today
        $alreadyVisited = SiteVisitor::where('session_id', $sessionId)
            ->where('page_url', $pageUrl)
            ->whereDate('visited_at', $today)
            ->exists();

        return SiteVisitor::create([
            'session_id' => $sessionId,
            'ip_address' => $data['ip_address'] ?? null,
            'user_agent' => $data['user_agent'] ?? null,
            'page_url' => $pageUrl,
            'referrer_url' => $data['referrer_url'] ?? null,
            'resort_id' => $data['resort_id'] ?? null,
            'is_unique' => ! $alreadyVisited,
            'visited_at' => now(),
        ]);
    }

    /**
     * Get overall visitor stats.
     * Consolidated from 8 queries to 2 using conditional aggregation.
     */
    public function getStats(): array
    {
        $today = now()->toDateString();
        $weekStart = now()->startOfWeek()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();

        // Period-based stats in one query
        $periodRow = SiteVisitor::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN is_unique THEN 1 ELSE 0 END) as unique_count,
            SUM(CASE WHEN DATE(visited_at) = ? THEN 1 ELSE 0 END) as today_total,
            SUM(CASE WHEN DATE(visited_at) = ? AND is_unique THEN 1 ELSE 0 END) as today_unique,
            SUM(CASE WHEN DATE(visited_at) >= ? THEN 1 ELSE 0 END) as week_total,
            SUM(CASE WHEN DATE(visited_at) >= ? AND is_unique THEN 1 ELSE 0 END) as week_unique,
            SUM(CASE WHEN DATE(visited_at) >= ? THEN 1 ELSE 0 END) as month_total,
            SUM(CASE WHEN DATE(visited_at) >= ? AND is_unique THEN 1 ELSE 0 END) as month_unique
        ", [$today, $today, $weekStart, $weekStart, $monthStart, $monthStart])->first();

        // All-time count in a second query (avoids full-table conditional)
        $allTimeRow = SiteVisitor::selectRaw('COUNT(*) as total, SUM(CASE WHEN is_unique THEN 1 ELSE 0 END) as unique_count')->first();

        return [
            'today' => [
                'total' => (int) ($periodRow->today_total ?? 0),
                'unique' => (int) ($periodRow->today_unique ?? 0),
            ],
            'this_week' => [
                'total' => (int) ($periodRow->week_total ?? 0),
                'unique' => (int) ($periodRow->week_unique ?? 0),
            ],
            'this_month' => [
                'total' => (int) ($periodRow->month_total ?? 0),
                'unique' => (int) ($periodRow->month_unique ?? 0),
            ],
            'all_time' => [
                'total' => (int) ($allTimeRow->total ?? 0),
                'unique' => (int) ($allTimeRow->unique_count ?? 0),
            ],
        ];
    }

    /**
     * Get daily visit counts for the last N days.
     */
    public function getDailyVisits(int $days = 30): array
    {
        $startDate = now()->subDays($days)->toDateString();

        $rows = SiteVisitor::whereDate('visited_at', '>=', $startDate)
            ->selectRaw('DATE(visited_at) as date, COUNT(*) as total, SUM(CASE WHEN is_unique THEN 1 ELSE 0 END) as unique_count')
            ->groupByRaw('DATE(visited_at)')
            ->orderBy('date')
            ->get();

        return $rows->map(fn ($row) => [
            'date' => $row->date,
            'total' => (int) $row->total,
            'unique' => (int) $row->unique_count,
        ])->all();
    }

    /**
     * Get top visited pages.
     */
    public function getTopPages(int $limit = 10): array
    {
        return SiteVisitor::selectRaw('page_url, COUNT(*) as total, SUM(CASE WHEN is_unique THEN 1 ELSE 0 END) as unique_count')
            ->groupBy('page_url')
            ->orderByDesc('total')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'page_url' => $row->page_url,
                'total' => (int) $row->total,
                'unique' => (int) $row->unique_count,
            ])
            ->all();
    }

    /**
     * Get top visited resorts.
     * Uses a single JOIN query instead of N+1 lookups.
     */
    public function getTopResorts(int $limit = 10): array
    {
        $resortIds = SiteVisitor::whereNotNull('resort_id')
            ->selectRaw('resort_id, COUNT(*) as total, SUM(CASE WHEN is_unique THEN 1 ELSE 0 END) as unique_count')
            ->groupBy('resort_id')
            ->orderByDesc('total')
            ->limit($limit)
            ->get();

        if ($resortIds->isEmpty()) {
            return [];
        }

        // Batch-resolve resort names in a single query
        $names = Resort::withoutGlobalScopes()
            ->whereIn('id', $resortIds->pluck('resort_id'))
            ->pluck('name', 'id');

        return $resortIds->map(fn ($row) => [
            'resort_id' => $row->resort_id,
            'resort_name' => $names[$row->resort_id] ?? null,
            'total' => (int) $row->total,
            'unique' => (int) $row->unique_count,
        ])->all();
    }

    /**
     * Get recent visitors.
     */
    public function getRecentVisitors(int $limit = 20): array
    {
        return SiteVisitor::with('resort:id,name')
            ->orderByDesc('visited_at')
            ->limit($limit)
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'page_url' => $v->page_url,
                'referrer_url' => $v->referrer_url,
                'resort_name' => $v->resort?->name,
                'is_unique' => $v->is_unique,
                'visited_at' => $v->visited_at?->toIso8601String(),
            ])
            ->all();
    }
}
