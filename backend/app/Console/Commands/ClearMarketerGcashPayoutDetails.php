<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ClearMarketerGcashPayoutDetails extends Command
{
    protected $signature = 'marketing:clear-gcash-payout-details {--dry-run : List marketers that would be cleared without updating}';

    protected $description = 'Clear legacy GCash payout fields on marketing users (hard cutover to bank payouts).';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        $q = User::query()
            ->where('role', 'marketing')
            ->where(function ($w): void {
                $w->whereNotNull('gcash_account_number')
                    ->orWhereNotNull('gcash_account_holder_name');
            });

        $count = (int) $q->count();
        if ($count === 0) {
            $this->info('No marketing users with GCash payout details on file.');

            return self::SUCCESS;
        }

        if ($dry) {
            $this->info("Dry-run: would clear GCash details for {$count} marketer(s).");

            return self::SUCCESS;
        }

        $updated = $q->update([
            'gcash_account_number' => null,
            'gcash_account_holder_name' => null,
        ]);

        $this->info("Cleared GCash payout details for {$updated} marketer(s).");

        return self::SUCCESS;
    }
}
