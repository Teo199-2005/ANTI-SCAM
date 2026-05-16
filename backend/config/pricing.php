<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Pricing pilot mode (live gateway smoke tests)
    |--------------------------------------------------------------------------
    |
    | When enabled, all Xendit invoice amounts for the flows below are forced
    | to a flat pilot unit (default ₱1 per checkout), regardless of term or
    | quantity. UI should mirror via NEXT_PUBLIC_PRICING_PILOT_* on the SPA.
    |
    | Disable before serving real customers.
    |
    */
    'pilot_mode' => filter_var(env('PRICING_PILOT_MODE', false), FILTER_VALIDATE_BOOL),

    'pilot_amount_php' => max(0.01, (float) env('PRICING_PILOT_AMOUNT', 1)),

    /*
    | Reference base for extra-room slot prepay tier math (matches 1-month standard).
    | Used only when pilot mode is off.
    */
    'subscription_tier_reference_php' => 2100.0,

    'subscription_tier_monthly_php' => [
        1 => 2100.0,
        3 => 1900.0,
        6 => 1700.0,
        12 => 1500.0,
    ],
];
