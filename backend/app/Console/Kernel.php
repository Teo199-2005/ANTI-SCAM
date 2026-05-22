<?php

namespace App\Console;

use App\Console\Commands\BackfillSubscriptions;
use App\Console\Commands\EnforceSubscriptionGrace;
use App\Console\Commands\ExpireBookingLocks;
use App\Console\Commands\GenerateMonthlyInvoices;
use App\Console\Commands\ClearMarketerGcashPayoutDetails;
use App\Console\Commands\ProcessMarketerCommissionPayouts;
use App\Console\Commands\ReconcileMarketerPayoutBatches;
use App\Console\Commands\ReportStaleMarketerPayoutBatches;
use App\Console\Commands\SendSubscriptionExpiryReminders;
use App\Console\Commands\SendTestEmail;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected $commands = [
        BackfillSubscriptions::class,
        ExpireBookingLocks::class,
        GenerateMonthlyInvoices::class,
        EnforceSubscriptionGrace::class,
        SendSubscriptionExpiryReminders::class,
        SendTestEmail::class,
        ClearMarketerGcashPayoutDetails::class,
        ProcessMarketerCommissionPayouts::class,
        ReconcileMarketerPayoutBatches::class,
        ReportStaleMarketerPayoutBatches::class,
    ];

    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('booking:expire-locks')->hourly();
        $schedule->command('subscriptions:generate-invoices')->dailyAt('00:05');
        $schedule->command('subscriptions:send-expiry-reminders')
            ->dailyAt('08:00')
            ->timezone('Asia/Manila');
        $schedule->command('subscriptions:enforce-grace')->dailyAt('00:10');
        $schedule->command('marketing:process-commission-payouts')
            ->monthlyOn(10, '06:00')
            ->timezone('Asia/Manila');
        $schedule->command('marketing:report-stale-payout-batches')
            ->dailyAt('07:30')
            ->timezone('Asia/Manila');
        $schedule->command('marketing:reconcile-payout-batches')->hourly();
    }

    protected function commands(): void
    {
        //
    }
}
