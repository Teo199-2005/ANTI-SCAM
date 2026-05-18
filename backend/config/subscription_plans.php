<?php

return [
  'standard' => [
    'label' => 'Verified Resort',
    'badge_label' => 'Verified Resort',
    'max_rooms' => 10,
    'monthly_price_php' => 0,
    'listing_priority' => 0,
    'features' => [
      'pms',
      'calendar',
      'booking_site',
      'notifications',
      'guest_dashboard',
      'reservation_management',
      'online_booking',
      'payment_methods',
      'verified_listing',
    ],
  ],
  'business_pro' => [
    'label' => 'Premium Verified Resort',
    'badge_label' => 'Premium Verified Resort',
    'max_rooms' => 20,
    'monthly_price_php' => 1000,
    'listing_priority' => 100,
    'features' => [
      'analytics',
      'revenue_reports',
      'guest_traffic_analytics',
      'conversion_reports',
      'video_embed',
      'priority_listing',
      'downloadable_reports',
      'priority_support',
      'reward_growth_program',
      'business_insights',
    ],
  ],
  'enterprise' => [
    'label' => 'Enterprise',
    'badge_label' => 'Enterprise Resort',
    'max_rooms' => 50,
    'monthly_price_php' => 0,
    'listing_priority' => 200,
    'features' => [],
  ],
];
