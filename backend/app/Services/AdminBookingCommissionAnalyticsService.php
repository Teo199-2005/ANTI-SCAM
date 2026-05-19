<?php

namespace App\Services;

use App\Models\Commission;
use App\Models\MarketerBookingCommissionEvent;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AdminBookingCommissionAnalyticsService
{
    public function __construct(
        private readonly MarketingBookingCommissionSettingsService $settings,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function report(?int $year = null): array
    {
        $year = $year ?? (int) Carbon::now()->year;
        $periodStart = sprintf('%04d-01', $year);
        $periodEnd = sprintf('%04d-12', $year);

        $creditAgg = MarketerBookingCommissionEvent::query()
            ->where('type', MarketerBookingCommissionEvent::TYPE_CREDIT)
            ->whereBetween('period', [$periodStart, $periodEnd])
            ->selectRaw('COUNT(*) as c, COALESCE(SUM(amount), 0) as gross')
            ->first();

        $reversalAgg = MarketerBookingCommissionEvent::query()
            ->where('type', MarketerBookingCommissionEvent::TYPE_REVERSAL)
            ->whereBetween('period', [$periodStart, $periodEnd])
            ->selectRaw('COUNT(*) as c, COALESCE(SUM(amount), 0) as gross')
            ->first();

        $creditsCount = (int) ($creditAgg->c ?? 0);
        $creditsGross = round((float) ($creditAgg->gross ?? 0), 2);
        $reversalsCount = (int) ($reversalAgg->c ?? 0);
        $reversalsGross = round((float) ($reversalAgg->gross ?? 0), 2);

        $monthlyRows = MarketerBookingCommissionEvent::query()
            ->select('period', 'type', DB::raw('COUNT(*) as event_count'), DB::raw('COALESCE(SUM(amount), 0) as gross_php'))
            ->whereBetween('period', [$periodStart, $periodEnd])
            ->groupBy('period', 'type')
            ->orderBy('period')
            ->get();

        $monthly = [];
        foreach ($monthlyRows as $row) {
            $p = (string) $row->period;
            if (! isset($monthly[$p])) {
                $monthly[$p] = [
                    'period' => $p,
                    'credits_count' => 0,
                    'credits_gross_php' => 0.0,
                    'reversals_count' => 0,
                    'reversals_gross_php' => 0.0,
                    'net_credited_php' => 0.0,
                ];
            }
            if ($row->type === MarketerBookingCommissionEvent::TYPE_CREDIT) {
                $monthly[$p]['credits_count'] = (int) $row->event_count;
                $monthly[$p]['credits_gross_php'] = round((float) $row->gross_php, 2);
            } else {
                $monthly[$p]['reversals_count'] = (int) $row->event_count;
                $monthly[$p]['reversals_gross_php'] = round((float) $row->gross_php, 2);
            }
        }
        foreach ($monthly as &$m) {
            $m['net_credited_php'] = round($m['credits_gross_php'] - $m['reversals_gross_php'], 2);
        }
        unset($m);
        ksort($monthly);

        $topMarketers = MarketerBookingCommissionEvent::query()
            ->from('marketer_booking_commission_events as e')
            ->join('users as u', 'u.id', '=', 'e.marketer_id')
            ->where('e.type', MarketerBookingCommissionEvent::TYPE_CREDIT)
            ->whereBetween('e.period', [$periodStart, $periodEnd])
            ->groupBy('e.marketer_id', 'u.name', 'u.email')
            ->orderByDesc(DB::raw('SUM(e.amount)'))
            ->limit(25)
            ->selectRaw(
                'e.marketer_id, u.name as marketer_name, u.email as marketer_email,
                COUNT(*) as credits_count,
                COALESCE(SUM(e.amount), 0) as credits_gross_php'
            )
            ->get()
            ->map(static fn ($r): array => [
                'marketer_id' => (int) $r->marketer_id,
                'marketer_name' => (string) $r->marketer_name,
                'marketer_email' => (string) $r->marketer_email,
                'credits_count' => (int) $r->credits_count,
                'credits_gross_php' => round((float) $r->credits_gross_php, 2),
            ])
            ->values()
            ->all();

        $bookingTierKey = (string) config('marketing_booking_commission.tier_key', 'booking_flat');

        $bookingPending = (float) Commission::query()
            ->where('status', 'pending')
            ->where('marketer_tier', $bookingTierKey)
            ->sum('commission_amount');
        $bookingReleased = (float) Commission::query()
            ->where('status', 'released')
            ->where('marketer_tier', $bookingTierKey)
            ->sum('commission_amount');
        $legacyPending = (float) Commission::query()
            ->where('status', 'pending')
            ->where(function ($q) use ($bookingTierKey): void {
                $q->whereNull('marketer_tier')
                    ->orWhere('marketer_tier', '!=', $bookingTierKey);
            })
            ->sum('commission_amount');
        $legacyReleased = (float) Commission::query()
            ->where('status', 'released')
            ->where(function ($q) use ($bookingTierKey): void {
                $q->whereNull('marketer_tier')
                    ->orWhere('marketer_tier', '!=', $bookingTierKey);
            })
            ->sum('commission_amount');

        $marketersActive = (int) User::query()->where('role', 'marketing')->count();

        return [
            'year' => $year,
            'current_rate_php' => $this->settings->amountPhpForNewCredits(),
            'commissions_enabled' => $this->settings->isEnabled(),
            'policy_note' => $this->settings->policyNote(),
            'totals' => [
                'credits_count' => $creditsCount,
                'credits_gross_php' => $creditsGross,
                'reversals_count' => $reversalsCount,
                'reversals_gross_php' => $reversalsGross,
                'net_credited_php' => round($creditsGross - $reversalsGross, 2),
                'marketers_active' => $marketersActive,
            ],
            'monthly' => array_values($monthly),
            'top_marketers' => $topMarketers,
            'commission_ledger' => [
                'booking_pending_gross_php' => round($bookingPending, 2),
                'booking_released_gross_php' => round($bookingReleased, 2),
                'legacy_pending_gross_php' => round($legacyPending, 2),
                'legacy_released_gross_php' => round($legacyReleased, 2),
            ],
        ];
    }
}
