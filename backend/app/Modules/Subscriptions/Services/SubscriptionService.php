<?php

namespace App\Modules\Subscriptions\Services;

use App\Models\Resort;
use App\Models\Subscription;
use App\Modules\Audit\Services\AuditLogService;
use App\Services\EmailNotificationService;
use App\Services\ReferralSignupTrialService;

class SubscriptionService
{
    public function __construct(
        private readonly AuditLogService $audits,
        private readonly EmailNotificationService $emails
    ) {}

    public function calculateMonthlyBilling(string $plan, int $roomCount): array
    {
        // Current base standard plan defaults:
        // - 3 included rooms
        // - ₱2,100 base (1-month standard)
        // - ₱300 per extra active room
        $plan = 'basic';
        $base = 2100.00;
        $included = 3;
        $extraFee = 300.00;
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

    /**
     * @param  bool  $activateIfNew  When true, new subscriptions start active (demos/admin). Default false — owners must pay or use a referral trial.
     */
    public function refreshForResort(Resort $resort, string $plan = 'basic', bool $activateIfNew = false): Subscription
    {
        $roomCount = $resort->rooms()->where('status', 'active')->count();
        $pricing = $this->calculateMonthlyBilling($plan, $roomCount);

        $subscription = Subscription::query()->firstOrNew([
            'resort_id' => $resort->id,
            'tenant_id' => $resort->tenant_id,
        ]);

        $oldValues = $subscription->exists ? $subscription->only(['plan', 'base_price', 'extra_room_fee', 'active_room_count', 'total_monthly_fee']) : null;

        $subscription->fill($pricing);

        if (! $subscription->exists) {
            $cycleStart = now()->startOfDay();
            $cycleEnd = $cycleStart->copy()->addMonth()->subDay();
            $subscription->billing_cycle_start = $cycleStart->toDateString();
            $subscription->billing_cycle_end = $cycleEnd->toDateString();
            $subscription->next_due_date = $cycleEnd->toDateString();
            $subscription->status = $activateIfNew ? 'active' : 'expired';
        } else {
            $subscription->billing_cycle_start = $subscription->billing_cycle_start ?? now()->startOfMonth()->toDateString();
            $subscription->billing_cycle_end = $subscription->billing_cycle_end ?? now()->endOfMonth()->toDateString();
            $subscription->next_due_date = $subscription->next_due_date ?? now()->endOfMonth()->toDateString();
            if (! in_array((string) $subscription->status, ['active', 'expired'], true)) {
                $subscription->status = 'active';
            }
        }
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
        $updated = app(ReferralSignupTrialService::class)->expireLapsedTrials();

        Subscription::query()
            ->where('status', 'active')
            ->whereDate('next_due_date', '<', now()->toDateString())
            ->with('resort')
            ->chunkById(100, function ($subscriptions) use (&$updated): void {
                foreach ($subscriptions as $subscription) {
                    $subscription->status = 'expired';
                    $subscription->grace_until = null;
                    $subscription->save();

                    $subscription->resort()?->update(['is_publicly_listed' => false]);
                    if ($subscription->resort) {
                        $this->emails->sendSuspensionNotice($subscription->resort);
                    }
                    $updated++;
                }
            });

        return $updated;
    }
}
