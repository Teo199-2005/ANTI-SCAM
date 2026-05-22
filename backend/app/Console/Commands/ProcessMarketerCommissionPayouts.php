<?php

namespace App\Console\Commands;

use App\Services\MarketerCommissionPayoutService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class ProcessMarketerCommissionPayouts extends Command
{
    protected $signature = 'marketing:process-commission-payouts
                            {--dry-run : Compute eligible payouts without calling Xendit or locking funds}
                            {--date= : ISO date (Y-m-d) treated as payout run day in Asia/Manila; default today}';

    protected $description = 'Pay marketing partners pending commissions (bank transfer via Xendit) for eligible periods.';

    public function handle(MarketerCommissionPayoutService $payouts): int
    {
        $dry = (bool) $this->option('dry-run');
        $dateOpt = (string) ($this->option('date') ?? '');
        $asOf = $dateOpt !== ''
            ? Carbon::parse($dateOpt)->startOfDay()
            : Carbon::now()->startOfDay();

        $this->info('Run as-of: '.$asOf->toIso8601String().($dry ? ' (dry-run)' : ''));

        $result = $payouts->run($asOf, $dry);

        $this->info('Processed: '.$result['processed'].'; skipped: '.$result['skipped']);
        foreach ($result['errors'] as $err) {
            $this->warn($err);
        }

        return self::SUCCESS;
    }
}
