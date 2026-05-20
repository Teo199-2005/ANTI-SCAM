<?php

namespace App\Console\Commands;

use App\Modules\Billing\Services\BookingPaymentReconciliationService;
use App\Services\ReservationCheckoutExpiryService;
use Illuminate\Console\Command;

class ReconcileBookingInvoicePaymentsCommand extends Command
{
    protected $signature = 'payments:reconcile-booking-invoices';

    protected $description = 'Poll Xendit for PAID guest booking invoices and align local reservation state (webhook safety net).';

    public function handle(
        BookingPaymentReconciliationService $reconciliation,
        ReservationCheckoutExpiryService $checkoutExpiry,
    ): int {
        $paid = $reconciliation->reconcileStalePendingPayments();
        $expired = $checkoutExpiry->expireStalePendingPayments();
        $this->info("Reconciled {$paid} paid reservation(s). Expired {$expired} abandoned checkout hold(s).");

        return self::SUCCESS;
    }
}
