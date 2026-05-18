<?php

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$key = (string) config('services.xendit.secret_key');
$mode = str_starts_with($key, 'xnd_production_') ? 'production' : (str_starts_with($key, 'xnd_development_') ? 'development' : 'unknown');

echo "APP_ENV: ".config('app.env')."\n";
echo "Key mode: {$mode}\n";
echo "Key prefix: ".substr($key, 0, 20)."... (len ".strlen($key).")\n";
echo "Mock allowed: ".(config('services.xendit.allow_mock_paid') ? 'yes' : 'no')."\n";
echo "Mock on 403: ".(config('services.xendit.local_mock_on_forbidden') ? 'yes' : 'no')."\n\n";

if ($key === '') {
    echo "ERROR: XENDIT_SECRET_KEY is empty in config.\n";
    exit(1);
}

$response = Illuminate\Support\Facades\Http::withBasicAuth($key, '')
    ->timeout(30)
    ->withOptions(['verify' => false])
    ->post('https://api.xendit.co/v2/invoices', [
        'external_id' => 'debug-invoice-'.time(),
        'amount' => 1000,
        'description' => 'Anti-ScamPH debug invoice',
        'currency' => 'PHP',
        'invoice_duration' => 86400,
        'customer' => [
            'given_names' => 'Debug',
            'email' => 'owner@resort.test',
        ],
    ]);

echo "POST /v2/invoices => HTTP {$response->status()}\n";
echo $response->body()."\n\n";

if (! $response->successful()) {
    $body = $response->json();
    $code = is_array($body) ? (string) ($body['error_code'] ?? '') : '';
    if ($code === 'UNAUTHORIZED_SENDER_IP') {
        echo ">>> This is NOT a wrong API key. Xendit requires your public IP on the key allowlist.\n";
        echo ">>> Fix: https://dashboard.xendit.co/settings/developers#ip-allowlist — add 103.149.101.154\n";
        echo ">>> Or use xnd_development_ key for local, or keep mock flags above for simulated checkout.\n";
    }
}

exit($response->successful() ? 0 : 1);
