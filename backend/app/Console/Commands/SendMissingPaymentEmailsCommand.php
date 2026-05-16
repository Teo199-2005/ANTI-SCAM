<?php

namespace App\Console\Commands;

use App\Models\Reservation;
use App\Services\EmailNotificationService;
use Illuminate\Console\Command;

class SendMissingPaymentEmailsCommand extends Command
{
    protected $signature = 'reservations:send-missing-payment-emails {--limit=100 : Max reservations to process}';

    protected $description = 'Send booking confirmation and payment receipt emails for paid reservations that never received them';

    public function handle(EmailNotificationService $emails): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $processed = 0;

        Reservation::withoutGlobalScopes()
            ->where('status', 'confirmed')
            ->where('xendit_payment_status', 'paid')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->each(function (Reservation $reservation) use ($emails, &$processed): void {
                $emails->sendReservationPaymentNotificationsIfMissing(
                    $reservation->loadMissing(['client', 'resort', 'room'])
                );
                $processed++;
            });

        $this->info("Processed {$processed} reservation(s).");

        return self::SUCCESS;
    }
}
