<?php

namespace App\Console;

use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected $commands = [
        \App\Console\Commands\BackfillSubscriptions::class,
        \App\Console\Commands\ExpireBookingLocks::class,
        \App\Console\Commands\GenerateMonthlyInvoices::class,
        \App\Console\Commands\EnforceSubscriptionGrace::class,
        \App\Console\Commands\SendTestEmail::class,
    ];

    protected function schedule(\Illuminate\Console\Scheduling\Schedule $schedule): void
    {
        $schedule->command('booking:expire-locks')->hourly();
        $schedule->command('subscriptions:generate-invoices')->dailyAt('00:05');
        $schedule->command('subscriptions:enforce-grace')->dailyAt('00:10');
    }

    protected function commands(): void
    {
        //
    }
}
