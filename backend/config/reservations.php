<?php

return [
    // Guests can cancel only before this many hours from check-in.
    'client_cancel_min_hours' => 24,
    // Reservation fee is fixed and non-refundable.
    'reservation_fee_non_refundable' => true,
    // Fallback when `system_settings.reservation_fee` is missing (PHP). Env optional override.
    'default_reservation_fee' => (float) env('RESERVATION_FEE_PHP', 500),
];
