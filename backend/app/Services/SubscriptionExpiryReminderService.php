<?php

namespace App\Services;

use App\Models\EmailLog;
use App\Models\Subscription;
use App\Modules\Billing\Support\SubscriptionBillingMode;
class SubscriptionExpiryReminderService
{
    public const REMINDER_DAYS = [7, 3, 1];

    public function __construct(private readonly EmailNotificationService $emails) {}

    /**
     * @return array{sent: int, skipped: int}
     */
    public function sendDueReminders(): array
    {
        $sent = 0;
        $skipped = 0;

        foreach (self::REMINDER_DAYS as $daysBefore) {
            $targetEndDate = now()->addDays($daysBefore)->toDateString();

            $subscriptions = Subscription::withoutGlobalScopes()
                ->where('status', 'active')
                ->whereDate('billing_cycle_end', $targetEndDate)
                ->with('resort')
                ->get();

            foreach ($subscriptions as $subscription) {
                if ($this->reminderAlreadySent($subscription, $daysBefore)) {
                    $skipped++;

                    continue;
                }

                $isAutoCard = SubscriptionBillingMode::recurringActive(
                    $subscription->billing_mode,
                    $subscription->recurring_cancelled_at
                );

                $this->emails->sendSubscriptionExpiryReminder(
                    $subscription,
                    $daysBefore,
                    $isAutoCard
                );
                $sent++;
            }
        }

        return ['sent' => $sent, 'skipped' => $skipped];
    }

    private function reminderAlreadySent(Subscription $subscription, int $daysBefore): bool
    {
        $cycleEnd = $subscription->billing_cycle_end?->toDateString();
        if ($cycleEnd === null) {
            return true;
        }

        return EmailLog::query()
            ->where('type', 'subscription_expiry_reminder')
            ->whereIn('status', ['queued', 'sent'])
            ->where('metadata->subscription_id', $subscription->id)
            ->where('metadata->days_before', $daysBefore)
            ->where('metadata->billing_cycle_end', $cycleEnd)
            ->exists();
    }
}
