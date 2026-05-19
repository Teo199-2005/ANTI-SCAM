<?php

return [

    /** Master switch for crediting/reversing booking commissions. */
    'enabled' => filter_var(env('MARKETING_BOOKING_COMMISSION_ENABLED', true), FILTER_VALIDATE_BOOL),

    /** Flat PHP credited per qualifying online paid booking. */
    'amount_php' => (float) env('MARKETING_BOOKING_COMMISSION_PHP', 10),

    /** Tier key stored on commission rows for booking credits. */
    'tier_key' => 'booking_flat',

];
