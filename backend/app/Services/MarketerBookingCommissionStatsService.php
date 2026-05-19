<?php

namespace App\Services;

use App\Models\MarketerBookingCommissionEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MarketerBookingCommissionStatsService
{
    public function __construct(
        private readonly MarketingBookingCommissionSettingsService $settings,
    ) {}

    public function commissionPerBookingPhp(): float
    {
        return $this->settings->amountPhpForNewCredits();
    }

    public function bookingCommissionPolicySummary(): string
    {
        $amount = $this->commissionPerBookingPhp();

        return "You earn ₱{$amount} for each paid online guest booking at resorts linked to your referral. "
            .'Manual bookings and unpaid checkouts do not qualify. If a paid booking is cancelled before your commission is paid out, the ₱'
            .$amount.' credit is reversed while it is still pending. '
            .'Pending earnings are disbursed via GCash on the platform schedule after withholding.';
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
