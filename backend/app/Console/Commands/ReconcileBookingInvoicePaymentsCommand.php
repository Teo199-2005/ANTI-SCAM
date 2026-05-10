<?php

namespace App\Console\Commands;

use App\Modules\Billing\Services\BookingPaymentReconciliationService;
use Illuminate\Console\Command;

class ReconcileBookingInvoicePaymentsCommand extends Command
{
    protected $signature = 'payments:reconcile-booking-invoices';

    protected $description = 'Poll Xendit for PAID guest booking invoices and align local reservation state (webhook safety net).';

    public function handle(BookingPaymentReconciliationService $reconciliation): int
    {
        $n = $reconciliation->reconcileStalePendingPayments();
        $this->info("Reconciled {$n} reservation(s) from Xendit invoice status.");

        return self::SUCCESS;
    }
}
