<?php

/**
 * Leadership booking commissions — informational accrual for admin company analytics.
 * Each qualifying paid online guest booking (same basis as marketer booking credits)
 * accrues the configured PHP amount per executive role.
 */
return [

    'amount_php_per_booking' => (float) env('EXECUTIVE_COMMISSION_PHP_PER_BOOKING', 20),

    'executives' => [
        [
            'key' => 'coo',
            'name' => 'Adrian Park',
            'role_title' => 'Chief Operating Officer',
            'role_short' => 'COO',
            'bio' => 'Keeps day-to-day operations consistent, efficient, and ready for every guest stay.',
        ],
        [
            'key' => 'cto',
            'name' => 'Teofilo Harry Paet',
            'role_title' => 'Chief Technology Officer',
            'role_short' => 'CTO',
            'bio' => 'Builds resilient booking systems and elegant product experiences.',
        ],
        [
            'key' => 'cmo',
            'name' => 'Ailene Manuel',
            'role_title' => 'Chief Marketing Officer',
            'role_short' => 'CMO',
            'bio' => 'Shapes brand narrative, campaigns, and trust across every guest touchpoint.',
        ],
    ],

];
