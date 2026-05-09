<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'xendit' => [
        'secret_key' => env('XENDIT_SECRET_KEY'),
        'webhook_token' => env('XENDIT_WEBHOOK_TOKEN'),
        // true (default), absolute path to cacert.pem, or false (local dev only — not production)
        'http_verify' => env('XENDIT_HTTP_VERIFY', true),
        // explicit local-only testing switch: auto-mark invoices as paid without real gateway
        'allow_mock_paid' => env('XENDIT_ALLOW_MOCK_PAID', false),
        // if true, forbidden key (403) can also use local mock flow (still local-only)
        'local_mock_on_forbidden' => env('XENDIT_LOCAL_MOCK_ON_FORBIDDEN', false),
        /** GCash channel for Create Payout (PH). */
        'payout_channel_code' => env('XENDIT_PAYOUT_CHANNEL_CODE', 'PH_GCASH'),
    ],

    'marketing_payout' => [
        /** When false, the scheduled job and artisan command no-op (safe default). */
        'enabled' => env('MARKETING_PAYOUT_ENABLED', false),
        'min_php' => (float) env('MARKETING_PAYOUT_MIN_PHP', 1),
        'timezone' => env('MARKETING_PAYOUT_TIMEZONE', 'Asia/Manila'),
        /** Fraction withheld from gross commissions before GCash payout (taxes & platform fees), e.g. 0.10 = 10%. */
        'withholding_rate' => (float) env('MARKETING_PAYOUT_WITHHOLDING_RATE', 0.10),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL').'/auth/google/callback'),
    ],

    'mail_brand' => [
        'logo_url' => env('MAIL_BRAND_LOGO_URL', ''),
        'support_email' => env('MAIL_SUPPORT_EMAIL', env('MAIL_FROM_ADDRESS')),
        'trademark_line' => env(
            'MAIL_TRADEMARK_LINE',
            'Anti-Scam PH is a product and service operated by The Rising 2 Brothers OPC.'
        ),
    ],

];
