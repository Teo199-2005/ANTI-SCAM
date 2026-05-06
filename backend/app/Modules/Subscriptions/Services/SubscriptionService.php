<?php

namespace App\Modules\Subscriptions\Services;

use App\Models\Resort;
use App\Models\Subscription;
use App\Modules\Audit\Services\AuditLogService;

class SubscriptionService
{
    public function __construct(private readonly AuditLogService $audits) {}

    public function calculateMonthlyBilling(string $plan, int $roomCount): array
    {
        // support new plan types with different included rooms/prices
        switch ($plan) {
            case 'vip':
                $base = 5000.00;
                $included = 10;
                $extraFee = 500.00;
                break;
            case 'premium':
                $base = 2500.00;
                $included = 6;
                $extraFee = 400.00;
                break;
            case 'basic':
            default:
                $base = 1300.00;
                $included = 3;
                $extraFee = 300.00;
                break;
        }
        $extraRooms = max(0, $roomCount - $included);
        $total = $base + ($extraRooms * $extraFee);

        return [
            'plan' => $plan,
            'base_price' => $base,
            'included_rooms' => $included,
            'extra_room_fee' => $extraFee,
            'active_room_count' => $roomCount,
            'total_monthly_fee' => $total,
        ];
    }

    public function refreshForResort(Resort $resort, string $plan = 'standard'): Subscription
    {
        $roomCount = $resort->rooms()->where('status', 'active')->count();
        $pricing = $this->calculateMonthlyBilling($plan, $roomCount);

        $subscription = Subscription::query()->firstOrNew([
            'resort_id' => $resort->id,
            'tenant_id' => $resort->tenant_id,
        ]);

        $oldValues = $subscription->exists ? $subscription->only(['plan', 'base_price', 'extra_room_fee', 'active_room_count', 'total_monthly_fee']) : null;

        $subscription->fill($pricing);
        $subscription->billing_cycle_start = $subscription->billing_cycle_start ?? now()->startOfMonth()->toDateString();
        $subscription->billing_cycle_end = $subscription->billing_cycle_end ?? now()->endOfMonth()->toDateString();
        $subscription->next_due_date = $subscription->next_due_date ?? now()->endOfMonth()->toDateString();
        $subscription->status = $subscription->status ?: 'pending_payment';
        $subscription->save();

        $this->audits->log(
            'subscription_recalculated',
            'subscription',
            $subscription->id,
            $oldValues,
            $subscription->only(['plan', 'base_price', 'extra_room_fee', 'active_room_count', 'total_monthly_fee'])
        );

        return $subscription->refresh();
    }

    public function applyGracePeriodRules(): int
    {
        $updated = 0;

        $dueSubscriptions = Subscription::query()
            ->whereIn('status', ['pending_payment', 'active'])
            ->whereDate('next_due_date', '<', now()->toDateString())
            ->get();

        foreach ($dueSubscriptions as $subscription) {
            $subscription->status = 'grace_period';
            $subscription->grace_until = now()->addDays(5)->toDateString();
            $subscription->save();
            $updated++;
        }

        $expiredGrace = Subscription::query()
            ->where('status', 'grace_period')
            ->whereDate('grace_until', '<', now()->toDateString())
            ->get();

        foreach ($expiredGrace as $subscription) {
            $subscription->status = 'suspended';
            $subscription->save();

            $subscription->resort()->update(['is_publicly_listed' => false]);
            $updated++;
        }

        return $updated;
    }
}
