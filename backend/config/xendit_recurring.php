<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Xendit Recurring (card auto-renewal)
    |--------------------------------------------------------------------------
    |
    | Requires Recurring / Subscriptions product enabled on your Xendit account.
    | When false, card checkouts still work as one-off invoices; owners renew manually.
    |
    */
    'enabled' => filter_var(env('XENDIT_RECURRING_ENABLED', false), FILTER_VALIDATE_BOOL),

    'api_version' => env('XENDIT_RECURRING_API_VERSION', '2026-01-01'),

    /** Payment methods that may auto-renew via Xendit Recurring (Visa, Mastercard, JCB → CREDIT_CARD). */
    'recurring_payment_methods' => ['CREDIT_CARD'],

    /**
     * Allowed on manual-renewal invoices (no auto-debit).
     * Omit CREDIT_CARD so card users who want recurring must pick Card explicitly.
     */
    'manual_payment_methods' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env(
            'XENDIT_MANUAL_PAYMENT_METHODS',
            'GCASH,GRABPAY,SHOPEEPAY,PAYMAYA,QRPH,DIRECT_DEBIT,DD_BPI,DD_UBP'
        ))
    ))),

];
