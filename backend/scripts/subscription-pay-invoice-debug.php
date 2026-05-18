<?php

/**
 * Simulates resort-owner Business Pro checkout (same service as POST pay-invoice).
 *
 * Usage: php scripts/subscription-pay-invoice-debug.php [owner-email]
 */

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Resort;
use App\Models\User;
use App\Modules\Billing\Services\XenditRecurringSubscriptionService;
use App\Modules\Billing\Services\XenditSubscriptionInvoiceService;
use App\Support\PricingPilot;

$email = $argv[1] ?? 'maylinpaet19@gmail.com';

$owner = User::withoutGlobalScopes()->where('email', $email)->where('role', 'resort_owner')->first();
if (! $owner) {
    echo "ERROR: No resort_owner with email {$email}\n";
    exit(1);
}

$resort = Resort::withoutGlobalScopes()->where('tenant_id', $owner->tenant_id)->first();
if (! $resort) {
    echo "ERROR: No resort for tenant {$owner->tenant_id}\n";
    exit(1);
}

$subscription = $resort->subscription()->first();
if (! $subscription) {
    echo "ERROR: No subscription for resort #{$resort->id}\n";
    exit(1);
}

echo "Owner: {$owner->email} (tenant {$owner->tenant_id})\n";
echo "Resort: #{$resort->id} {$resort->name}\n";
echo "Plan: {$subscription->plan} status={$subscription->status}\n";
echo "Pricing pilot: ".(PricingPilot::enabled() ? 'yes' : 'no')."\n\n";

/** @var XenditSubscriptionInvoiceService $invoices */
$invoices = app(XenditSubscriptionInvoiceService::class);
/** @var XenditRecurringSubscriptionService $recurring */
$recurring = app(XenditRecurringSubscriptionService::class);

$amount = $invoices->resolveChargeAmount($subscription, 'monthly', 1, 1);
echo "Charge amount (PHP): {$amount}\n";

$paymentMethods = $recurring->resolveCheckoutPaymentMethods(null);
$setupRecurring = $recurring->shouldSetupRecurringOnCheckout(null, 'monthly');
echo 'Recurring on checkout: '.($setupRecurring ? 'yes' : 'no')."\n";
echo 'Checkout return base: https://anti-scamph.com'."\n\n";

try {
    $result = $invoices->createInvoice(
        $subscription,
        $paymentMethods,
        '',
        'monthly',
        1,
        null,
        null,
        1,
        'https://anti-scamph.com',
        $setupRecurring,
        'checkout',
    );
} catch (Throwable $e) {
    echo 'FAILED: '.$e->getMessage()."\n";
    exit(1);
}

echo "OK — subscription invoice created\n";
echo 'invoice_url: '.($result['invoice_url'] ?? '(none)')."\n";
echo 'xendit_invoice_id: '.($result['invoice_id'] ?? '(none)')."\n";
echo 'subscription_invoice_id: '.($result['subscription_invoice_id'] ?? '(none)')."\n";

exit(0);
