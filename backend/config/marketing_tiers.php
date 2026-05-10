<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Marketer tier bands (converting resorts = distinct resorts with a paid
    | qualifying subscription invoice attributed to the marketer).
    |--------------------------------------------------------------------------
    */
    'bands' => [
        [
            'tier_key' => 'silver',
            'label' => 'Silver',
            'min_clients' => 1,
            'max_clients' => 100,
            'per_payment_php' => 150,
        ],
        [
            'tier_key' => 'gold',
            'label' => 'Gold',
            'min_clients' => 101,
            'max_clients' => 200,
            'per_payment_php' => 200,
        ],
        [
            'tier_key' => 'platinum',
            'label' => 'Platinum',
            'min_clients' => 201,
            'max_clients' => null,
            'per_payment_php' => 250,
        ],
    ],

    /**
     * If set, ignore tier bands and credit this flat PHP per qualifying invoice (ops escape hatch).
     * Null = use tier bands only.
     */
    'emergency_flat_per_payment_php' => env('MARKETING_TIER_EMERGENCY_FLAT_PHP') !== null
        ? (float) env('MARKETING_TIER_EMERGENCY_FLAT_PHP')
        : null,
];
