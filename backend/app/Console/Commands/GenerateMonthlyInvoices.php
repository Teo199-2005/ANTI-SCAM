<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Modules\Billing\Services\XenditSubscriptionInvoiceService;
use App\Modules\Billing\Support\SubscriptionBillingMode;
use App\Services\EmailNotificationService;
use Illuminate\Console\Command;
use RuntimeException;

class GenerateMonthlyInvoices extends Command
{
    protected $signature = 'subscriptions:generate-invoices';

    protected $description = 'Generate recurring monthly invoices for due active subscriptions and send reminders.';

    public function handle(
        EmailNotificationService $emails,
        XenditSubscriptionInvoiceService $invoiceService
    ): int {
        $dueSubscriptions = Subscription::withoutGlobalScopes()
            ->where('status', 'active')
            ->whereDate('next_due_date', '<=', now()->toDateString())
            ->get();

        $processed = 0;
        $created = 0;
        $skippedAutoCard = 0;

        foreach ($dueSubscriptions as $subscription) {
            $autoRenewActive = SubscriptionBillingMode::recurringActive(
                $subscription->billing_mode,
                $subscription->recurring_cancelled_at
            );

            if (! $autoRenewActive) {
                $alreadyPendingForCycle = SubscriptionInvoice::withoutGlobalScopes()
                    ->where('subscription_id', $subscription->id)
                    ->whereDate('billing_cycle_start', (string) $subscription->billing_cycle_start)
                    ->whereDate('billing_cycle_end', (string) $subscription->billing_cycle_end)
                    ->where('status', 'pending')
                    ->whereNotNull('xendit_invoice_id')
                    ->exists();

                if (! $alreadyPendingForCycle) {
                    $durationMonths = max(1, (int) $subscription->renewal_duration_months);
                    $durationMonths = in_array($durationMonths, [1, 3, 6, 12], true) ? $durationMonths : 1;

                    try {
                        $invoiceService->createInvoice(
                            $subscription,
                            [],
                            '',
                            'monthly',
                            1,
                            null,
                            null,
                            $durationMonths,
                            null,
                            false,
                            'cron_manual',
                        );
                        $created++;
                    } catch (RuntimeException $e) {
                        report($e);
                        $this->warn("Failed to generate recurring invoice for subscription #{$subscription->id}: {$e->getMessage()}");
                    }
                }
            } else {
                $skippedAutoCard++;
            }

            $emails->sendSubscriptionDue($subscription->loadMissing('resort'));
            $processed++;
        }

        $this->info("Processed {$processed} due subscription(s); created {$created} manual invoice(s); skipped {$skippedAutoCard} auto-card subscription(s); sent reminders.");

        return Command::SUCCESS;
    }
}
