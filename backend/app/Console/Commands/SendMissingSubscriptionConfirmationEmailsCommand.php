<?php

namespace App\Console\Commands;

use App\Models\SubscriptionInvoice;
use App\Services\EmailNotificationService;
use Illuminate\Console\Command;

class SendMissingSubscriptionConfirmationEmailsCommand extends Command
{
    protected $signature = 'subscriptions:send-missing-confirmation-emails {--limit=100 : Max paid invoices to process}';

    protected $description = 'Send Business Pro activation or renewal confirmation emails for paid subscription invoices that never received them';

    public function handle(EmailNotificationService $emails): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $processed = 0;
        $sent = 0;

        SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->with(['subscription.resort'])
            ->get()
            ->each(function (SubscriptionInvoice $invoice) use ($emails, &$processed, &$sent): void {
                $subscription = $invoice->subscription;
                if (! $subscription) {
                    return;
                }

                $processed++;
                $beforeActivation = $emails->shouldSendBusinessProActivationEmail($subscription, $invoice);
                $beforeRenewal = ! $beforeActivation;

                $emails->sendSubscriptionPaymentConfirmationIfMissing($subscription, $invoice);

                if ($beforeActivation && ! $emails->shouldSendBusinessProActivationEmail($subscription->refresh(), $invoice)) {
                    $sent++;
                } elseif ($beforeRenewal) {
                    $sent++;
                }
            });

        $this->info("Processed {$processed} paid invoice(s); attempted to send up to {$sent} confirmation email(s).");

        return self::SUCCESS;
    }
}
