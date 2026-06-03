<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\SiteVisitor;
use Illuminate\Console\Command;

class PurgeOldSiteVisitors extends Command
{
    protected $signature = 'visitors:purge {--days=90 : Delete visitor records older than this many days}';

    protected $description = 'Purge old site visitor records to keep the table from growing unbounded';

    public function handle(): int
    {
        $days = (int) $this->option('days');

        if ($days < 7) {
            $this->error('Minimum retention period is 7 days.');
            return Command::FAILURE;
        }

        $cutoff = now()->subDays($days);

        $deleted = SiteVisitor::where('visited_at', '<', $cutoff)->delete();

        $this->info("Purged {$deleted} visitor record(s) older than {$days} days (before {$cutoff->toDateString()}).");

        return Command::SUCCESS;
    }
}
