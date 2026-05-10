<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class MarketerTierService
{
    /**
     * Default bands (used when config is missing, e.g. before config cache refresh).
     *
     * @var list<array{tier_key: string, label: string, min_clients: int, max_clients: int|null, per_payment_php: float|int}>
     */
    private const DEFAULT_BANDS = [
        ['tier_key' => 'silver', 'label' => 'Silver', 'min_clients' => 1, 'max_clients' => 100, 'per_payment_php' => 150],
        ['tier_key' => 'gold', 'label' => 'Gold', 'min_clients' => 101, 'max_clients' => 200, 'per_payment_php' => 200],
        ['tier_key' => 'platinum', 'label' => 'Platinum', 'min_clients' => 201, 'max_clients' => null, 'per_payment_php' => 250],
    ];

    /**
     * Distinct resorts with at least one paid, qualifying subscription invoice for this marketer.
     * Matches admin marketing monitoring "referred_resorts_count" definition.
     */
    public function countConvertingResorts(int $marketerId): int
    {
        $conversionSub = DB::table('subscription_invoices')
            ->select('marketer_id', 'resort_id', DB::raw('MIN(paid_at) as first_paid'))
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereNotNull('marketer_id')
            ->whereNotNull('resort_id')
            ->where(function ($q): void {
                $q->whereNull('plan')->orWhere('plan', 'not like', '%_room_addon%');
            })
            ->groupBy('marketer_id', 'resort_id');

        $row = DB::query()
            ->fromSub($conversionSub, 'conv')
            ->where('conv.marketer_id', $marketerId)
            ->selectRaw('COUNT(*) as c')
            ->first();

        return $row ? (int) $row->c : 0;
    }

    /**
     * @return array<string, mixed>|null Null when no tier (zero converting resorts).
     */
    public function resolveTier(int $convertingResortsCount): ?array
    {
        if ($convertingResortsCount < 1) {
            return null;
        }

        $emergency = $this->emergencyFlatPerPaymentPhp();
        if ($emergency !== null && $emergency > 0) {
            return [
                'tier_key' => 'emergency_flat',
                'label' => 'Standard',
                'per_payment_php' => round((float) $emergency, 2),
                'min_clients' => 1,
                'max_clients' => null,
                'next_tier_at' => null,
                'clients_to_next_tier' => null,
            ];
        }

        foreach ($this->bands() as $band) {
            $min = (int) $band['min_clients'];
            $max = $band['max_clients'] !== null ? (int) $band['max_clients'] : null;
            if ($convertingResortsCount < $min) {
                continue;
            }
            if ($max !== null && $convertingResortsCount > $max) {
                continue;
            }

            $nextTierAt = null;
            $clientsToNext = null;
            if ($max !== null) {
                $nextTierAt = $max + 1;
                $clientsToNext = max(0, $nextTierAt - $convertingResortsCount);
            }

            return [
                'tier_key' => (string) $band['tier_key'],
                'label' => (string) $band['label'],
                'per_payment_php' => round((float) $band['per_payment_php'], 2),
                'min_clients' => $min,
                'max_clients' => $max,
                'next_tier_at' => $nextTierAt,
                'clients_to_next_tier' => $clientsToNext,
            ];
        }

        return null;
    }

    /**
     * Full ladder for API / UI (no user-specific counts).
     *
     * @return list<array<string, mixed>>
     */
    public function tierLadder(): array
    {
        $bands = $this->bands();
        $out = [];
        foreach ($bands as $band) {
            $min = (int) $band['min_clients'];
            $max = $band['max_clients'];
            $out[] = [
                'tier_key' => (string) $band['tier_key'],
                'label' => (string) $band['label'],
                'min_clients' => $min,
                'max_clients' => $max,
                'per_payment_php' => round((float) $band['per_payment_php'], 2),
                'client_range_label' => $max === null
                    ? "{$min}+"
                    : "{$min}–{$max}",
            ];
        }

        return $out;
    }

    public function tierPolicySummary(): string
    {
        return 'Tier is based on your total converting resorts (distinct resort partners with at least one paid platform subscription invoice attributed to you; room add-ons excluded). '
            .'Each time a qualifying subscription payment is recorded, your current tier sets the commission amount credited for that resort billing period. '
            .'Payouts follow the platform schedule and withholding shown in your dashboard.';
    }

    /**
     * @return list<array{tier_key: string, label: string, min_clients: int, max_clients: int|null, per_payment_php: float|int}>
     */
    private function bands(): array
    {
        $bands = config('marketing_tiers.bands');
        if (is_array($bands) && $bands !== []) {
            return $bands;
        }

        return self::DEFAULT_BANDS;
    }

    private function emergencyFlatPerPaymentPhp(): ?float
    {
        $v = config('marketing_tiers.emergency_flat_per_payment_php');

        return is_numeric($v) && (float) $v > 0 ? (float) $v : null;
    }
}
