<?php

namespace App\Services;

use App\Models\Commission;
use App\Models\MarketerBookingCommissionEvent;
use App\Models\Reservation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingReferralCommissionService
{
    public function __construct(
        private readonly MarketerResortAttributionService $attribution,
        private readonly MarketingBookingCommissionSettingsService $settings,
        private readonly MarketerBookingCommissionRateService $commissionRates,
    ) {}

    public function isEnabled(): bool
    {
        return $this->settings->isEnabled();
    }

    /** Platform default rate (new credits when marketer has no override). */
    public function amountPhp(): float
    {
        return $this->settings->amountPhpForNewCredits();
    }

    /** Rate for a specific marketer (override or platform default). */
    public function amountPhpForMarketer(int $marketerId): float
    {
        return $this->commissionRates->effectiveAmountPhpForMarketer($marketerId);
    }

    public function qualifiesForCredit(Reservation $reservation): bool
    {
        return $reservation->booking_source === 'online'
            && $reservation->status === 'confirmed'
            && $reservation->xendit_payment_status === 'paid';
    }

    /**
     * Credit flat booking commission when an online reservation is paid and confirmed.
     */
    public function creditFromPaidReservation(Reservation $reservation): void
    {
        if (! $this->isEnabled() || ! $this->qualifiesForCredit($reservation)) {
            return;
        }

        $marketerId = $this->attribution->resolveMarketerIdForResort((int) $reservation->resort_id);
        if ($marketerId === null) {
            return;
        }

        $amount = $this->amountPhpForMarketer($marketerId);
        $period = $this->periodForReservation($reservation);
        $tierKey = (string) config('marketing_booking_commission.tier_key', 'booking_flat');

        try {
            DB::transaction(function () use ($reservation, $marketerId, $amount, $period, $tierKey): void {
                $existingCredit = MarketerBookingCommissionEvent::query()
                    ->where('reservation_id', $reservation->id)
                    ->where('type', MarketerBookingCommissionEvent::TYPE_CREDIT)
                    ->lockForUpdate()
                    ->exists();

                if ($existingCredit) {
                    return;
                }

                $commission = Commission::query()->firstOrNew([
                    'marketer_id' => $marketerId,
                    'resort_id' => $reservation->resort_id,
                    'period' => $period,
                ]);

                $wasFirstBookingInPeriod = (int) ($commission->booking_count ?? 0) === 0;

                $commission->gross_bookings = (float) ($commission->gross_bookings ?? 0) + $amount;
                $commission->booking_count = (int) ($commission->booking_count ?? 0) + 1;
                $commission->commission_amount = (float) ($commission->commission_amount ?? 0) + $amount;
                $commission->commission_rate = 0;
                $commission->marketer_tier = $tierKey;
                if ($wasFirstBookingInPeriod) {
                    $commission->unit_commission_php = $amount;
                }
                if (! $commission->exists || $commission->status === null) {
                    $commission->status = 'pending';
                }
                $commission->save();

                MarketerBookingCommissionEvent::query()->create([
                    'reservation_id' => $reservation->id,
                    'marketer_id' => $marketerId,
                    'resort_id' => $reservation->resort_id,
                    'commission_id' => $commission->id,
                    'amount' => $amount,
                    'type' => MarketerBookingCommissionEvent::TYPE_CREDIT,
                    'period' => $period,
                    'meta' => [
                        'xendit_invoice_id' => $reservation->xendit_invoice_id,
                    ],
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                return;
            }
            throw $e;
        }
    }

    /**
     * Reverse commission when a previously credited booking is cancelled (pending, unlocked only).
     */
    public function reverseFromCancelledReservation(Reservation $reservation): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $credit = MarketerBookingCommissionEvent::query()
            ->where('reservation_id', $reservation->id)
            ->where('type', MarketerBookingCommissionEvent::TYPE_CREDIT)
            ->first();

        if ($credit === null) {
            return;
        }

        if (MarketerBookingCommissionEvent::query()
            ->where('reservation_id', $reservation->id)
            ->where('type', MarketerBookingCommissionEvent::TYPE_REVERSAL)
            ->exists()) {
            return;
        }

        $commission = Commission::query()->find($credit->commission_id);
        if ($commission === null) {
            return;
        }

        if ($commission->status !== 'pending' || $commission->payout_batch_id !== null) {
            Log::info('Booking commission reversal skipped: commission locked or released.', [
                'reservation_id' => $reservation->id,
                'commission_id' => $commission->id,
                'status' => $commission->status,
                'payout_batch_id' => $commission->payout_batch_id,
            ]);

            return;
        }

        $amount = (float) $credit->amount;

        try {
            DB::transaction(function () use ($reservation, $credit, $commission, $amount): void {
                $commission = Commission::query()->whereKey($commission->id)->lockForUpdate()->first();
                if ($commission === null || $commission->status !== 'pending' || $commission->payout_batch_id !== null) {
                    return;
                }

                $commission->gross_bookings = max(0, (float) $commission->gross_bookings - $amount);
                $commission->booking_count = max(0, (int) $commission->booking_count - 1);
                $commission->commission_amount = max(0, (float) $commission->commission_amount - $amount);
                $commission->save();

                MarketerBookingCommissionEvent::query()->create([
                    'reservation_id' => $reservation->id,
                    'marketer_id' => $credit->marketer_id,
                    'resort_id' => $credit->resort_id,
                    'commission_id' => $commission->id,
                    'amount' => $amount,
                    'type' => MarketerBookingCommissionEvent::TYPE_REVERSAL,
                    'period' => $credit->period,
                    'meta' => [
                        'reason' => 'cancelled',
                    ],
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                return;
            }
            throw $e;
        }
    }

    public function periodForReservation(Reservation $reservation): string
    {
        $tz = (string) config('services.marketing_payout.timezone', 'Asia/Manila');
        $moment = $reservation->reserved_at ?? $reservation->updated_at ?? now();

        return Carbon::parse($moment)->timezone($tz)->format('Y-m');
    }

    private function isUniqueViolation(\Illuminate\Database\QueryException $e): bool
    {
        $code = (string) ($e->errorInfo[1] ?? '');

        return in_array($code, ['1062', '23505'], true);
    }
}
