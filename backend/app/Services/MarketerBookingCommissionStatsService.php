<?php

namespace App\Services;

use App\Models\MarketerBookingCommissionEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MarketerBookingCommissionStatsService
{
    public function __construct(
        private readonly MarketingBookingCommissionSettingsService $settings,
        private readonly MarketerBookingCommissionRateService $commissionRates,
    ) {}

    public function commissionPerBookingPhp(?int $marketerId = null): float
    {
        if ($marketerId !== null) {
            return $this->commissionRates->effectiveAmountPhpForMarketer($marketerId);
        }

        return $this->settings->amountPhpForNewCredits();
    }

    public function bookingCommissionPolicySummary(?int $marketerId = null): string
    {
        $amount = $this->commissionPerBookingPhp($marketerId);
        $rateLabel = $this->formatPhpLabel($amount);

        return "You earn {$rateLabel} for each paid online guest booking at resorts linked to your referral. "
            .'Manual bookings and unpaid checkouts do not qualify. If a paid booking is cancelled before your commission is paid out, the '
            .$rateLabel.' credit is reversed while it is still pending. '
            .'Pending earnings are disbursed to your bank account on the platform schedule after withholding.';
    }

    private function formatPhpLabel(float $amount): string
    {
        $rounded = round($amount, 2);
        $decimals = fmod($rounded, 1.0) === 0.0 ? 0 : 2;

        return '₱'.number_format($rounded, $decimals, '.', ',');
    }

    public function qualifyingBookingsCount(int $marketerId, ?string $periodFrom = null, ?string $periodTo = null): int
    {
        $q = MarketerBookingCommissionEvent::query()
            ->where('marketer_id', $marketerId)
            ->where('type', MarketerBookingCommissionEvent::TYPE_CREDIT);

        if ($periodFrom !== null) {
            $q->where('period', '>=', $periodFrom);
        }
        if ($periodTo !== null) {
            $q->where('period', '<=', $periodTo);
        }

        return (int) $q->count();
    }

    public function reversedBookingsCount(int $marketerId, ?string $periodFrom = null, ?string $periodTo = null): int
    {
        $q = MarketerBookingCommissionEvent::query()
            ->where('marketer_id', $marketerId)
            ->where('type', MarketerBookingCommissionEvent::TYPE_REVERSAL);

        if ($periodFrom !== null) {
            $q->where('period', '>=', $periodFrom);
        }
        if ($periodTo !== null) {
            $q->where('period', '<=', $periodTo);
        }

        return (int) $q->count();
    }

    /**
     * @return array<string, int>
     */
    public function bookingCreditsByPeriod(int $marketerId, string $periodStart, string $periodEnd): array
    {
        return MarketerBookingCommissionEvent::query()
            ->select('period', DB::raw('COUNT(*) as c'))
            ->where('marketer_id', $marketerId)
            ->where('type', MarketerBookingCommissionEvent::TYPE_CREDIT)
            ->whereBetween('period', [$periodStart, $periodEnd])
            ->groupBy('period')
            ->pluck('c', 'period')
            ->map(static fn ($c): int => (int) $c)
            ->all();
    }

    public function currentMonthPeriod(): string
    {
        $tz = (string) config('services.marketing_payout.timezone', 'Asia/Manila');

        return Carbon::now($tz)->format('Y-m');
    }
}
