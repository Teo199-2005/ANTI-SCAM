<?php

namespace App\Console\Commands;

use App\Services\SubscriptionExpiryReminderService;
use Illuminate\Console\Command;

class SendSubscriptionExpiryReminders extends Command
{
    protected $signature = 'subscriptions:send-expiry-reminders';

    protected $description = 'Send 7-, 3-, and 1-day subscription expiry reminder emails to resort owners.';

    public function handle(SubscriptionExpiryReminderService $reminders): int
    {
        $result = $reminders->sendDueReminders();

        $this->info(sprintf(
            'Subscription expiry reminders: %d sent, %d skipped (already sent for this cycle).',
            $result['sent'],
            $result['skipped']
        ));

        return Command::SUCCESS;
    }
}
