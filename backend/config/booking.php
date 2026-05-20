<?php

return [
    /**
     * How long a pending_payment reservation blocks inventory while the guest pays online.
     * Matches booking lock TTL and Xendit invoice_duration (seconds) in XenditInvoiceService.
     */
    'payment_hold_minutes' => (int) env('BOOKING_PAYMENT_HOLD_MINUTES', 10),
];
