<?php

namespace App\Console\Commands;

use App\Services\LegacySubscriptionCommissionCleanupService;
use Illuminate\Console\Command;

class VoidLegacySubscriptionCommissions extends Command
{
    protected $signature = 'commissions:void-legacy-subscription {--marketer-id= : Limit cleanup to one marketing user id}';

    protected $description = 'Remove pending marketer commission rows from the deprecated subscription tier model';

    public function handle(LegacySubscriptionCommissionCleanupService $cleanup): int
    {
        $marketerId = $this->option('marketer-id');
        $id = is_numeric($marketerId) ? (int) $marketerId : null;

        $removed = $cleanup->voidPendingLegacyRows($id);

        $this->info("Removed {$removed} pending legacy subscription commission row(s).");

        return self::SUCCESS;
    }
}
