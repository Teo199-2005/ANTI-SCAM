<?php

namespace App\Modules\Billing\Services;

use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\User;
use App\Modules\Billing\Support\CheckoutReturnBaseResolver;
use App\Modules\Billing\Support\XenditTls;
use App\Services\DigitalAcknowledgmentReceiptService;
use App\Services\SubscriptionReferralCommissionService;
use App\Modules\Billing\Support\SubscriptionInvoicePlanTag;
use App\Modules\Billing\Support\XenditCheckoutUrl;
use App\Modules\Billing\Support\XenditGatewayErrorMessage;
use App\Support\PricingPilot;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class XenditSubscriptionInvoiceService
{
    public function __construct(
        private readonly CheckoutReturnBaseResolver $checkoutReturnBase,
        private readonly DigitalAcknowledgmentReceiptService $digitalReceipts,
    ) {}

    private function secretKey(): string
    {
        return (string) config('services.xendit.secret_key');
    }

    private function isConfigured(): bool
    {
        return $this->secretKey() !== '';
    }

    /** Public check for controllers (sync-after-checkout). */
    public function gatewayConfigured(): bool
    {
        return $this->isConfigured();
    }

    /**
     * GET invoice from Xendit (used when webhooks are delayed or unreachable locally).
     * Returns uppercase status e.g. PAID, PENDING, EXPIRED.
     */
    public function fetchXenditInvoiceStatus(string $xenditInvoiceId): ?string
    {
        if (! $this->isConfigured() || $xenditInvoiceId === '') {
            return null;
        }

        $url = 'https://api.xendit.co/v2/invoices/'.rawurlencode($xenditInvoiceId);

        try {
            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withOptions(XenditTls::httpClientOptions())
                ->timeout(30)
                ->get($url);
        } catch (ConnectionException $e) {
            if (app()->isProduction() || ! str_contains($e->getMessage(), 'cURL error 60')) {
                return null;
            }

            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withOptions(['verify' => false])
                ->timeout(30)
                ->get($url);
        }

        if (! $response->successful()) {
            return null;
        }

        $status = $response->json('status');

        return is_string($status) && $status !== '' ? strtoupper($status) : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function fetchXenditInvoicePayload(string $xenditInvoiceId): ?array
    {
        if (! $this->isConfigured() || $xenditInvoiceId === '') {
            return null;
        }

        $url = 'https://api.xendit.co/v2/invoices/'.rawurlencode($xenditInvoiceId);

        try {
            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withOptions(XenditTls::httpClientOptions())
                ->timeout(30)
                ->get($url);
        } catch (ConnectionException $e) {
            if (app()->isProduction() || ! str_contains($e->getMessage(), 'cURL error 60')) {
                return null;
            }

            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withOptions(['verify' => false])
                ->timeout(30)
                ->get($url);
        }

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();

        return is_array($data) ? $data : null;
    }

    public function createInvoice(
        Subscription $subscription,
        array $paymentMethods = [],
        string $referralCode = '',
        string $billingScope = 'monthly',
        int $roomAddonQuantity = 1,
        ?int $marketerId = null,
        ?string $storedReferralCode = null,
        int $durationMonths = 1,
        ?string $checkoutReturnBase = null,
        bool $setupRecurring = false,
        string $invoiceSource = 'checkout',
    ): array {
        $subscription->loadMissing('resort');

        $owner = User::withoutGlobalScopes()
            ->where('tenant_id', $subscription->tenant_id)
            ->where('role', 'resort_owner')
            ->first();

        if (! $owner) {
            throw new RuntimeException('No resort owner account found for this subscription.');
        }

        $base = $this->checkoutReturnBase->resolve($checkoutReturnBase);
        // Payments page was removed; land on Resort Overview with query for optional UI feedback.
        $successUrl = "{$base}/dashboard/resort?payment=success";
        $failureUrl = "{$base}/dashboard/resort?payment=failed";

        if (! $this->isConfigured() && app()->isProduction()) {
            throw new RuntimeException('Xendit secret key is not configured.');
        }

        if ($billingScope === 'room_addon') {
            throw new RuntimeException('Room add-on billing is no longer available. Upgrade to Business Pro for up to 20 rooms.');
        }

        $hasReferral = $referralCode !== '';
        $externalId = sprintf(
            'sub-pro-%d-%s%s',
            $subscription->id,
            (string) ($subscription->billing_cycle_start ?? now()->toDateString()),
            $hasReferral ? '-ref' : ''
        );

        $pilot = PricingPilot::enabled();
        $durationMonths = 1;
        $chargeAmount = $this->resolveChargeAmount($subscription, $billingScope, $roomAddonQuantity, $durationMonths);

        $description = sprintf(
            'Business Pro — %s · 1 month',
            $subscription->resort?->name ?? 'Resort'
        );
        $itemName = 'Business Pro Subscription';
        $invoicePlan = SubscriptionInvoicePlanTag::businessProMonthly($setupRecurring);

        $invoiceItems = [[
            'name' => $itemName,
            'quantity' => 1,
            'price' => $chargeAmount,
            'category' => 'Subscription',
        ]];

        if (! $this->isConfigured()) {
            if ($this->canUseLocalMockPaid()) {
                Log::warning('[Mock] Subscription auto-paid with no Xendit key (local override enabled).', [
                    'subscription_id' => $subscription->id,
                ]);

                return $this->createLocalMockPaidInvoice(
                    $subscription,
                    $chargeAmount,
                    $successUrl,
                    $invoicePlan,
                    $billingScope,
                    $roomAddonQuantity,
                    $marketerId,
                    $storedReferralCode
                );
            }

            throw new RuntimeException('Xendit secret key is missing. Payment cannot proceed until gateway is configured.');
        }

        $invoiceBody = [
            'external_id' => $externalId,
            'amount' => $chargeAmount,
            'description' => $description,
            'currency' => 'PHP',
            'invoice_duration' => 86400 * 7, // 7 days
            'customer' => [
                'given_names' => $owner->name,
                'email' => $owner->email,
            ],
            'success_redirect_url' => $successUrl,
            'failure_redirect_url' => $failureUrl,
            'items' => $invoiceItems,
        ];

        // Restrict to the payment method the resort owner selected (if any)
        if (! empty($paymentMethods)) {
            $invoiceBody['payment_methods'] = $paymentMethods;
        }

        try {
            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withOptions(XenditTls::httpClientOptions())
                ->timeout(30)
                ->post('https://api.xendit.co/v2/invoices', $invoiceBody);
        } catch (ConnectionException $e) {
            // Windows local fallback for cURL error 60 (missing local CA bundle).
            if (app()->isProduction() || ! str_contains($e->getMessage(), 'cURL error 60')) {
                throw $e;
            }

            Log::warning('Xendit TLS verify failed locally; retrying with verify=false once.', [
                'subscription_id' => $subscription->id,
            ]);

            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withOptions(['verify' => false])
                ->timeout(30)
                ->post('https://api.xendit.co/v2/invoices', $invoiceBody);
        }

        if (! $response->successful()) {
            $errorBody = $response->json();
            if ($this->shouldUseLocalMockOnForbidden($response->status(), $errorBody)) {
                Log::warning('[Mock] Falling back after Xendit forbidden key response.', [
                    'subscription_id' => $subscription->id,
                ]);

                return $this->createLocalMockPaidInvoice(
                    $subscription,
                    $chargeAmount,
                    $successUrl,
                    $invoicePlan,
                    $billingScope,
                    $roomAddonQuantity,
                    $marketerId,
                    $storedReferralCode
                );
            }

            Log::error('Xendit subscription invoice creation failed', [
                'status' => $response->status(),
                'body' => $errorBody,
                'subscription_id' => $subscription->id,
            ]);
            throw new RuntimeException($this->buildGatewayErrorMessage($response->status(), $errorBody));
        }

        $data = $response->json();

        $invoiceUrl = (string) ($data['invoice_url'] ?? '');
        if (! XenditCheckoutUrl::isValid($invoiceUrl)) {
            throw new RuntimeException('Xendit did not return a valid checkout URL. Verify API key permissions and IP allowlist.');
        }

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->id,
            'resort_id' => $subscription->resort_id,
            'xendit_invoice_id' => $data['id'] ?? null,
            'xendit_invoice_url' => $invoiceUrl,
            'amount' => $chargeAmount,
            'plan' => $invoicePlan,
            'referral_code' => $storedReferralCode,
            'marketer_id' => $marketerId,
            'status' => 'pending',
            'source' => $invoiceSource,
            'billing_cycle_start' => $subscription->billing_cycle_start,
            'billing_cycle_end' => $subscription->billing_cycle_end,
        ]);

        return [
            'invoice_id' => $invoice->xendit_invoice_id,
            'invoice_url' => $invoice->xendit_invoice_url,
            'subscription_invoice_id' => $invoice->id,
        ];
    }

    private function buildGatewayErrorMessage(int $status, mixed $errorBody): string
    {
        return XenditGatewayErrorMessage::fromResponse($status, $errorBody, 'Subscription payment');
    }

    private function shouldUseLocalMockOnForbidden(int $status, mixed $errorBody): bool
    {
        if (! $this->canUseLocalMockPaid() || ! (bool) config('services.xendit.local_mock_on_forbidden', false)) {
            return false;
        }

        return XenditGatewayErrorMessage::isRecoverableForbidden($status, $errorBody);
    }

    private function createLocalMockPaidInvoice(
        Subscription $subscription,
        float $chargeAmount,
        string $successUrl,
        string $invoicePlan,
        string $billingScope = 'monthly',
        int $roomAddonQuantity = 1,
        ?int $marketerId = null,
        ?string $storedReferralCode = null,
    ): array {
        $mockInvoiceId = 'mock-sub-inv-'.$subscription->id.'-'.now()->timestamp;

        $paidAt = now();
        $ackNo = $this->digitalReceipts->allocate(
            DigitalAcknowledgmentReceiptService::KIND_SUBSCRIPTION,
            $paidAt
        );

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->id,
            'resort_id' => $subscription->resort_id,
            'xendit_invoice_id' => $mockInvoiceId,
            'xendit_invoice_url' => $successUrl,
            'amount' => $chargeAmount,
            'plan' => $invoicePlan,
            'referral_code' => $storedReferralCode,
            'marketer_id' => $marketerId,
            'status' => 'paid',
            'paid_at' => $paidAt,
            'billing_cycle_start' => $subscription->billing_cycle_start,
            'billing_cycle_end' => $subscription->billing_cycle_end,
            'acknowledgment_receipt_no' => $ackNo,
        ]);

        if ($billingScope === 'room_addon') {
            throw new RuntimeException('Room add-on billing is no longer available.');
        }

        app(SubscriptionPaymentConfirmationService::class)->applyBaseSubscriptionPayment($invoice);

        return [
            'invoice_id' => $mockInvoiceId,
            'invoice_url' => $successUrl,
            'subscription_invoice_id' => $invoice->id,
        ];
    }

    private function canUseLocalMockPaid(): bool
    {
        return ! app()->isProduction() && (bool) config('services.xendit.allow_mock_paid', false);
    }

    /**
     * Amount that would be charged on a new Xendit invoice for this subscription checkout.
     */
    public function resolveChargeAmount(
        Subscription $subscription,
        string $billingScope = 'monthly',
        int $roomAddonQuantity = 1,
        int $durationMonths = 1,
    ): float {
        if ($billingScope === 'room_addon') {
            throw new RuntimeException('Room add-on billing is no longer available.');
        }

        if (PricingPilot::enabled()) {
            return PricingPilot::flatInvoiceAmount();
        }

        return PricingPilot::businessProMonthlyPhp();
    }

    /**
     * Whether a stored pending invoice should not be reused (stale test invoice, expired, amount drift).
     */
    public function pendingInvoiceShouldBeReplaced(
        SubscriptionInvoice $invoice,
        Subscription $subscription,
        string $billingScope,
        int $roomAddonQuantity,
        int $durationMonths,
    ): bool {
        if ($invoice->xendit_invoice_id === null || $invoice->xendit_invoice_id === '') {
            return true;
        }

        try {
            $expectedAmount = $this->resolveChargeAmount($subscription, $billingScope, $roomAddonQuantity, $durationMonths);
        } catch (RuntimeException) {
            return true;
        }

        if (abs((float) $invoice->amount - $expectedAmount) > 0.009) {
            return true;
        }

        $gatewayStatus = $this->fetchXenditInvoiceStatus((string) $invoice->xendit_invoice_id);

        return $gatewayStatus === null || $gatewayStatus !== 'PENDING';
    }

}
