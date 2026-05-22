<?php

namespace App\Services;

use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\SubscriptionInvoice;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Removes pending commission rows from the deprecated per-subscription-payment tier model.
 * Platform earnings are booking commissions only ({@see BookingReferralCommissionService}).
 */
class LegacySubscriptionCommissionCleanupService
{
    public function bookingTierKey(): string
    {
        return (string) config('marketing_booking_commission.tier_key', 'booking_flat');
    }

    /** @param  Builder<Commission>  $query */
    public function scopeBookingCommissionsOnly(Builder $query): Builder
    {
        return $query->where('marketer_tier', $this->bookingTierKey());
    }

    /** @return Builder<Commission> */
    public function bookingCommissionsForMarketer(int $marketerId): Builder
    {
        return $this->scopeBookingCommissionsOnly(
            Commission::query()->where('marketer_id', $marketerId)
        );
    }

    public function sumPendingBookingGross(int $marketerId): float
    {
        return (float) $this->bookingCommissionsForMarketer($marketerId)
            ->where('status', 'pending')
            ->sum('commission_amount');
    }

    public function sumReleasedBookingGross(int $marketerId): float
    {
        return (float) $this->bookingCommissionsForMarketer($marketerId)
            ->where('status', 'released')
            ->sum('commission_amount');
    }

    public function sumTotalBookingGross(int $marketerId): float
    {
        return (float) $this->bookingCommissionsForMarketer($marketerId)->sum('commission_amount');
    }

    /** @return Collection<int, Commission> */
    public function pendingBookingRows(int $marketerId): Collection
    {
        return $this->bookingCommissionsForMarketer($marketerId)
            ->where('status', 'pending')
            ->orderBy('id')
            ->get();
    }

    public function isLegacySubscriptionCommission(Commission $commission): bool
    {
        $tier = (string) ($commission->marketer_tier ?? '');

        return $tier !== $this->bookingTierKey();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function legacyRowsForMarketer(int $marketerId): array
    {
        $rows = Commission::query()
            ->with(['resort:id,name'])
            ->where('marketer_id', $marketerId)
            ->where(function ($q): void {
                $q->whereNull('marketer_tier')
                    ->orWhere('marketer_tier', '!=', $this->bookingTierKey());
            })
            ->orderByDesc('id')
            ->get();

        $out = [];
        foreach ($rows as $commission) {
            $trigger = $this->resolveTriggerInvoice($commission);
            $out[] = [
                'commission_id' => $commission->id,
                'resort_id' => $commission->resort_id,
                'resort_name' => $commission->resort?->name,
                'period' => $commission->period,
                'status' => $commission->status,
                'amount_php' => round((float) $commission->commission_amount, 2),
                'marketer_tier' => $commission->marketer_tier,
                'unit_commission_php' => $commission->unit_commission_php !== null
                    ? round((float) $commission->unit_commission_php, 2)
                    : null,
                'trigger' => $trigger,
                'policy' => 'Deprecated subscription tier payout (₱ per paid platform invoice). No longer credited; booking commissions only.',
            ];
        }

        return $out;
    }

    /** Delete pending legacy rows that were never released. Returns rows removed. */
    public function voidPendingLegacyRows(?int $marketerId = null): int
    {
        $query = Commission::query()
            ->where('status', 'pending')
            ->where(function ($q): void {
                $q->whereNull('marketer_tier')
                    ->orWhere('marketer_tier', '!=', $this->bookingTierKey());
            });

        if ($marketerId !== null) {
            $query->where('marketer_id', $marketerId);
        }

        $ids = $query->pluck('id')->all();
        if ($ids === []) {
            return 0;
        }

        $releasedIds = CommissionRelease::query()
            ->whereIn('commission_id', $ids)
            ->pluck('commission_id')
            ->unique()
            ->all();

        $deletable = array_values(array_diff($ids, $releasedIds));
        if ($deletable === []) {
            return 0;
        }

        return DB::transaction(function () use ($deletable): int {
            return Commission::query()->whereIn('id', $deletable)->delete();
        });
    }

    /**
     * @return array<string, mixed>|null
     */
    private function resolveTriggerInvoice(Commission $commission): ?array
    {
        $query = SubscriptionInvoice::query()
            ->where('marketer_id', $commission->marketer_id)
            ->where('resort_id', $commission->resort_id)
            ->where('status', 'paid')
            ->whereNotNull('paid_at');

        $period = (string) $commission->period;
        if ($period !== '' && preg_match('/^\d{4}-\d{2}$/', $period) === 1) {
            $start = Carbon::createFromFormat('Y-m', $period)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $query->whereBetween('paid_at', [$start, $end]);
        }

        $invoice = $query->orderByDesc('paid_at')->first();

        if (! $invoice) {
            return null;
        }

        return [
            'subscription_invoice_id' => $invoice->id,
            'xendit_invoice_id' => $invoice->xendit_invoice_id,
            'amount_php' => round((float) $invoice->amount, 2),
            'plan' => $invoice->plan,
            'paid_at' => $invoice->paid_at?->toIso8601String(),
            'tenant_id' => $invoice->tenant_id,
        ];
    }
}
