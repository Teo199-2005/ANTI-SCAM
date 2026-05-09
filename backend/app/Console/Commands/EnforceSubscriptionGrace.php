<?php

namespace App\Console\Commands;

use App\Modules\Subscriptions\Services\SubscriptionService;
use Illuminate\Console\Command;

class EnforceSubscriptionGrace extends Command
{
    protected $signature = 'subscriptions:enforce-grace';
    protected $description = 'Apply grace period and suspension rules for overdue subscriptions.';

    public function handle(SubscriptionService $service): int
    {
        $updated = $service->applyGracePeriodRules();
        $this->info("Processed {$updated} subscription status updates.");
        return Command::SUCCESS;
    }
}

