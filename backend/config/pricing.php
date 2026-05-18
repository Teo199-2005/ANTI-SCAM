<?php

return [
  /*
  |--------------------------------------------------------------------------
  | Pricing pilot mode (live gateway smoke tests)
  |--------------------------------------------------------------------------
  */
  'pilot_mode' => filter_var(env('PRICING_PILOT_MODE', false), FILTER_VALIDATE_BOOL),

  'pilot_amount_php' => max(0.01, (float) env('PRICING_PILOT_AMOUNT', 1)),

  /** Business Pro monthly subscription (PHP). */
  'business_pro_monthly_php' => 1000.0,
];
