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

    /*
     * Cloudflare R2 (S3-compatible). Set AWS_* in .env; uploads use MEDIA_DISK=s3
     * (see config/media.php → filesystems.disks.s3).
     */
    'cloudflare_r2' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'auto'),
        'bucket' => env('AWS_BUCKET'),
        'endpoint' => env('AWS_ENDPOINT'),
        'url' => env('AWS_URL'),
        'use_path_style_endpoint' => filter_var(env('AWS_USE_PATH_STYLE_ENDPOINT', false), FILTER_VALIDATE_BOOL),
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
        /** Optional separate callback token for POST /webhooks/xendit/recurring; falls back to XENDIT_WEBHOOK_TOKEN. */
        'recurring_webhook_token' => env('XENDIT_RECURRING_WEBHOOK_TOKEN'),
        // true (default), absolute path to cacert.pem, or false (local dev only — not production)
        'http_verify' => env('XENDIT_HTTP_VERIFY', true),
        // explicit local-only testing switch: auto-mark invoices as paid without real gateway
        'allow_mock_paid' => env('XENDIT_ALLOW_MOCK_PAID', false),
        // if true, forbidden key (403) can also use local mock flow (still local-only)
        'local_mock_on_forbidden' => env('XENDIT_LOCAL_MOCK_ON_FORBIDDEN', false),
        /** Legacy default channel for in-flight GCash payout batches only (PH_GCASH). */
        'payout_channel_code' => env('XENDIT_PAYOUT_CHANNEL_CODE', 'PH_GCASH'),
    ],

    'marketing_payout' => [
        /** When false, the scheduled job and artisan command no-op (safe default). */
        'enabled' => env('MARKETING_PAYOUT_ENABLED', false),
        'min_php' => (float) env('MARKETING_PAYOUT_MIN_PHP', 1),
        'timezone' => env('MARKETING_PAYOUT_TIMEZONE', 'Asia/Manila'),
        /** Fraction withheld from gross commissions before bank payout (taxes & platform fees), e.g. 0.10 = 10%. */
        'withholding_rate' => (float) env('MARKETING_PAYOUT_WITHHOLDING_RATE', 0.10),
        /** Cache TTL (seconds) for Xendit PHP bank channel catalog. */
        'bank_channels_cache_seconds' => (int) env('MARKETING_PAYOUT_BANK_CHANNELS_CACHE_SECONDS', 86400),
        /**
         * Optional safety cap: if set (> 0), skip auto-batching when net payout exceeds this PHP amount
         * (forces ops to split or review — reduces blast-radius if data is wrong).
         */
        'max_net_php_per_batch' => env('MARKETING_PAYOUT_MAX_NET_PHP') !== null && env('MARKETING_PAYOUT_MAX_NET_PHP') !== ''
            ? (float) env('MARKETING_PAYOUT_MAX_NET_PHP')
            : null,
        /** Log warning if batches stay in pending_submit longer than this (hours). */
        'stale_pending_submit_hours' => (int) env('MARKETING_PAYOUT_STALE_PENDING_HOURS', 72),
        /** Log warning if submitted batches never complete within this many hours. */
        'stale_submitted_hours' => (int) env('MARKETING_PAYOUT_STALE_SUBMITTED_HOURS', 168),
        /**
         * When true, marketing:reconcile-payout-batches retries idempotent Xendit POST for old pending_submit
         * rows and polls GET /v2/payouts/{id} for submitted batches (webhook safety net).
         */
        'reconcile_poll_enabled' => filter_var(env('MARKETING_PAYOUT_RECONCILE_POLL', true), FILTER_VALIDATE_BOOL),
        /** Minimum age before retrying Xendit create on a pending_submit batch (avoids racing the monthly job). */
        'recover_pending_submit_after_minutes' => (int) env('MARKETING_PAYOUT_RECOVER_PENDING_MINUTES', 3),
        /** Minimum age before polling Xendit for a submitted batch. */
        'reconcile_submitted_poll_after_minutes' => (int) env('MARKETING_PAYOUT_POLL_SUBMITTED_MINUTES', 30),
        /**
         * Hard cap on how many times the reconciler will re-POST a stuck pending_submit batch
         * to Xendit before flagging it for manual ops review (status stays pending_submit, but
         * is excluded from auto-retries via last_attempt_error logging). Prevents infinite hammer.
         */
        'max_submit_attempts' => (int) env('MARKETING_PAYOUT_MAX_SUBMIT_ATTEMPTS', 8),
        /**
         * Exponential backoff base in minutes between retries: wait = base * 2^(attempts-1),
         * capped at 24h. Skipped when the reconciler runs.
         */
        'retry_backoff_base_minutes' => (int) env('MARKETING_PAYOUT_RETRY_BACKOFF_MINUTES', 5),
        /**
         * Require marketer to have a government-ID document on file before creating a payout batch.
         * Defaults FALSE so existing test data and pilots aren't blocked, but should be TRUE in
         * production to satisfy BSP Circular 1108 and AMLC Tier-1 KYC expectations.
         */
        'require_kyc' => filter_var(env('MARKETING_PAYOUT_REQUIRE_KYC', false), FILTER_VALIDATE_BOOL),
        /**
         * Require the bank account-holder name to be similar (>= MARKETING_PAYOUT_NAME_MATCH_THRESHOLD %)
         * to the marketer's account name. Mitigates money-mule risk where partner routes funds to a
         * third party. Defaults FALSE for compatibility; set TRUE in production.
         */
        'require_name_match' => filter_var(env('MARKETING_PAYOUT_REQUIRE_NAME_MATCH', false), FILTER_VALIDATE_BOOL),
        'name_match_threshold' => max(0, min(100, (int) env('MARKETING_PAYOUT_NAME_MATCH_THRESHOLD', 70))),
        /**
         * If set (>0), payouts whose net amount exceeds this PHP threshold require a manual approval
         * row before being submitted to Xendit (four-eyes principle). 0 / null disables.
         */
        'four_eyes_threshold_php' => env('MARKETING_PAYOUT_FOUR_EYES_PHP') !== null && env('MARKETING_PAYOUT_FOUR_EYES_PHP') !== ''
            ? (float) env('MARKETING_PAYOUT_FOUR_EYES_PHP')
            : null,
        /** When true, the BookingPaymentReconciliationService and similar will alert via Slack on critical mismatches. */
        'critical_alerts_via_slack' => filter_var(env('MARKETING_PAYOUT_SLACK_ALERTS', false), FILTER_VALIDATE_BOOL),
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
