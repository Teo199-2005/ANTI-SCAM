<?php

namespace App\Services;

use App\Models\MarketerBookingCommissionEvent;
use App\Models\Reservation;
use App\Models\SubscriptionInvoice;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AdminCompanyAnalyticsService
{
    public function __construct(
        private readonly MarketingBookingCommissionSettingsService $marketerBookingSettings,
    ) {}

    /**
     * Platform P&amp;L-style snapshot: guest inflows minus marketer and executive booking commissions.
     *
     * @return array<string, mixed>
     */
    public function report(?int $year = null, ?int $month = null): array
    {
        $year = $year ?? (int) Carbon::now()->year;
        $month = $month !== null && $month >= 1 && $month <= 12 ? $month : null;

        $periodStart = $month !== null
            ? sprintf('%04d-%02d', $year, $month)
            : sprintf('%04d-01', $year);
        $periodEnd = $month !== null
            ? sprintf('%04d-%02d', $year, $month)
            : sprintf('%04d-12', $year);

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
        $reversalsCount = (int) ($reversalAgg->c ?? 0);
        $marketerCreditsGross = round((float) ($creditAgg->gross ?? 0), 2);
        $marketerReversalsGross = round((float) ($reversalAgg->gross ?? 0), 2);
        $marketerNetCredited = round($marketerCreditsGross - $marketerReversalsGross, 2);

        $qualifyingBookingsNet = max(0, $creditsCount - $reversalsCount);

        $perExecutive = (float) config('executive_team.amount_php_per_booking', 20);
        $executiveRows = [];
        foreach (config('executive_team.executives', []) as $exec) {
            $commission = round($qualifyingBookingsNet * $perExecutive, 2);
            $executiveRows[] = [
                'key' => (string) ($exec['key'] ?? ''),
                'name' => (string) ($exec['name'] ?? ''),
                'role_title' => (string) ($exec['role_title'] ?? ''),
                'role_short' => (string) ($exec['role_short'] ?? ''),
                'bio' => (string) ($exec['bio'] ?? ''),
                'amount_php_per_booking' => $perExecutive,
                'qualifying_bookings' => $qualifyingBookingsNet,
                'commission_total_php' => $commission,
            ];
        }

        $executiveTeamTotal = round($qualifyingBookingsNet * $perExecutive * count($executiveRows), 2);

        $reservationBase = Reservation::withoutGlobalScopes()
            ->whereYear('created_at', $year)
            ->when($month !== null, fn ($q) => $q->whereMonth('created_at', $month));

        $guestBookingPaidTotal = (float) (clone $reservationBase)
            ->where('xendit_payment_status', 'paid')
            ->revenueEligible()
            ->sum('reservation_fee');

        $guestBookingPaidCount = (int) (clone $reservationBase)
            ->where('xendit_payment_status', 'paid')
            ->revenueEligible()
            ->count();

        $subPeriodStart = $month !== null
            ? Carbon::create($year, $month, 1)->startOfMonth()
            : Carbon::create($year, 1, 1)->startOfYear();
        $subPeriodEnd = $month !== null
            ? Carbon::create($year, $month, 1)->endOfMonth()
            : Carbon::create($year, 12, 31)->endOfYear();

        $subscriptionPaid = (float) SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', 'paid')
            ->where(function ($q) use ($subPeriodStart, $subPeriodEnd) {
                $q->whereBetween('paid_at', [$subPeriodStart, $subPeriodEnd])
                    ->orWhere(function ($q) use ($subPeriodStart, $subPeriodEnd) {
                        $q->whereNull('paid_at')
                            ->whereBetween('created_at', [$subPeriodStart, $subPeriodEnd]);
                    });
            })
            ->sum('amount');

        $estimatedPlatformFromBookings = round(
            $guestBookingPaidTotal - $marketerNetCredited - $executiveTeamTotal,
            2,
        );

        $monthlyExecutive = $this->monthlyExecutiveAccrual($year, $perExecutive, count($executiveRows));

        $waterfall = [
            [
                'key' => 'guest_booking_inflow',
                'label' => 'Guest booking payments (paid, revenue-eligible)',
                'amount_php' => round($guestBookingPaidTotal, 2),
                'kind' => 'inflow',
            ],
            [
                'key' => 'marketer_booking_commissions',
                'label' => 'Marketer booking commissions (net credited events)',
                'amount_php' => -$marketerNetCredited,
                'kind' => 'outflow',
            ],
            [
                'key' => 'executive_team',
                'label' => 'Executive team accrual (COO + CTO + CMO @ ₱'.number_format($perExecutive, 0).' each)',
                'amount_php' => -$executiveTeamTotal,
                'kind' => 'outflow',
            ],
            [
                'key' => 'estimated_retention',
                'label' => 'Estimated platform retention from guest bookings',
                'amount_php' => $estimatedPlatformFromBookings,
                'kind' => 'summary',
            ],
        ];

        return [
            'year' => $year,
            'month' => $month,
            'period_label' => $month !== null
                ? Carbon::create($year, $month, 1)->format('F Y')
                : (string) $year,
            'policy_note' => 'Qualifying bookings match marketer booking commission credits (paid online guest stays with attribution). '
                .'Each executive accrues ₱'.number_format($perExecutive, 0).' per net qualifying booking (credits minus reversals). '
                .'These are planning figures for admin monitoring — not payroll or automatic payouts.',
            'marketer_booking_rate_php' => $this->marketerBookingSettings->amountPhpForNewCredits(),
            'marketer_commissions_enabled' => $this->marketerBookingSettings->isEnabled(),
            'executive_amount_php_per_booking' => $perExecutive,
            'executive_count' => count($executiveRows),
            'executive_team_total_php' => $executiveTeamTotal,
            'executives' => $executiveRows,
            'qualifying_bookings' => [
                'credits_count' => $creditsCount,
                'reversals_count' => $reversalsCount,
                'net_count' => $qualifyingBookingsNet,
            ],
            'guest_bookings' => [
                'paid_count' => $guestBookingPaidCount,
                'paid_total_php' => round($guestBookingPaidTotal, 2),
            ],
            'subscription_inflows_paid_php' => round($subscriptionPaid, 2),
            'marketer_booking_commissions' => [
                'credits_gross_php' => $marketerCreditsGross,
                'reversals_gross_php' => $marketerReversalsGross,
                'net_credited_php' => $marketerNetCredited,
            ],
            'estimated_platform_retention_from_bookings_php' => $estimatedPlatformFromBookings,
            'waterfall' => $waterfall,
            'monthly_executive_accrual' => $monthlyExecutive,
        ];
    }

    /**
     * @return list<array{period: string, qualifying_bookings: int, team_total_php: float}>
     */
    private function monthlyExecutiveAccrual(int $year, float $perExecutive, int $executiveCount): array
    {
        $periodStart = sprintf('%04d-01', $year);
        $periodEnd = sprintf('%04d-12', $year);

        $creditsByPeriod = MarketerBookingCommissionEvent::query()
            ->where('type', MarketerBookingCommissionEvent::TYPE_CREDIT)
            ->whereBetween('period', [$periodStart, $periodEnd])
            ->select('period', DB::raw('COUNT(*) as c'))
            ->groupBy('period')
            ->pluck('c', 'period');

        $reversalsByPeriod = MarketerBookingCommissionEvent::query()
            ->where('type', MarketerBookingCommissionEvent::TYPE_REVERSAL)
            ->whereBetween('period', [$periodStart, $periodEnd])
            ->select('period', DB::raw('COUNT(*) as c'))
            ->groupBy('period')
            ->pluck('c', 'period');

        $rows = [];
        for ($m = 1; $m <= 12; $m++) {
            $p = sprintf('%04d-%02d', $year, $m);
            $net = max(0, (int) ($creditsByPeriod[$p] ?? 0) - (int) ($reversalsByPeriod[$p] ?? 0));
            $rows[] = [
                'period' => $p,
                'qualifying_bookings' => $net,
                'team_total_php' => round($net * $perExecutive * $executiveCount, 2),
            ];
        }

        return $rows;
    }
}
