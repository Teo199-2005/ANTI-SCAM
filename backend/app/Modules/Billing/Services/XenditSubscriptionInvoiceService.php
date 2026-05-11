<?php

namespace App\Modules\Billing\Services;

use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\User;
use App\Modules\Billing\Support\XenditTls;
use App\Services\SubscriptionReferralCommissionService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class XenditSubscriptionInvoiceService
{
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
    ): array {
        $subscription->loadMissing('resort');

        $owner = User::withoutGlobalScopes()
            ->where('tenant_id', $subscription->tenant_id)
            ->where('role', 'resort_owner')
            ->first();

        if (! $owner) {
            throw new RuntimeException('No resort owner account found for this subscription.');
        }

        $base = $this->resolveCheckoutReturnBase($checkoutReturnBase);
        // Payments page was removed; land on Resort Overview with query for optional UI feedback.
        $successUrl = "{$base}/dashboard/resort?payment=success";
        $failureUrl = "{$base}/dashboard/resort?payment=failed";

        if (! $this->isConfigured() && app()->isProduction()) {
            throw new RuntimeException('Xendit secret key is not configured.');
        }

        $isRoomAddon = $billingScope === 'room_addon';
        $hasReferral = $referralCode !== '';
        $externalId = sprintf(
            '%s-%d-%s%s',
            $isRoomAddon ? 'sub-addon' : 'sub',
            $subscription->id,
            (string) $subscription->billing_cycle_start,
            $hasReferral ? '-ref' : ''
        );

        if ($isRoomAddon) {
            $roomAddonQuantity = max(1, $roomAddonQuantity);
            $durationMonths = in_array($durationMonths, [1, 3, 6, 12], true) ? $durationMonths : 1;
            $baseExtra = (float) $subscription->extra_room_fee;
            if ($baseExtra <= 0) {
                throw new RuntimeException('Extra room fee is not configured for this subscription.');
            }
            // Same duration discounts as the main subscription (standard tier), applied to per-slot fee.
            $slotMonthly = round($baseExtra * ($this->monthlyRate($durationMonths) / 2100.0), 2);
            $chargeAmount = round($slotMonthly * $roomAddonQuantity * $durationMonths, 2);
            if ($chargeAmount <= 0) {
                throw new RuntimeException('Could not compute room add-on amount.');
            }
            $description = sprintf(
                'Extra room slots ×%d · %d-month prepay — %s (%s)',
                $roomAddonQuantity,
                $durationMonths,
                $subscription->resort?->name,
                $subscription->plan
            );
            $itemName = 'Extra Room Slot Add-on';
            $invoicePlan = sprintf('%s_room_addon_q%d_m%d', $subscription->plan, $roomAddonQuantity, $durationMonths);
        } else {
            $durationMonths = in_array($durationMonths, [1, 3, 6, 12], true) ? $durationMonths : 1;
            // Always use standard (non-referral) rates. Referral benefit is 1 free month,
            // not a cheaper per-month price. The 1-month term cannot use the promo
            // (there is no "N-1" month to charge when N=1).
            $monthlyRate = $this->monthlyRate($durationMonths);
            $isFirstMonthFree = $hasReferral && $durationMonths > 1;
            // First-month-free: charge for (N-1) months at standard rate, covering N months of service.
            $chargeAmount = $isFirstMonthFree
                ? $monthlyRate * ($durationMonths - 1)
                : $monthlyRate * $durationMonths;
            $description = sprintf(
                'Subscription fee — %s (%s) · %d month%s%s',
                $subscription->resort?->name,
                $subscription->plan,
                $durationMonths,
                $durationMonths > 1 ? 's' : '',
                $isFirstMonthFree ? ' (1st month free via referral)' : ''
            );
            $itemName = 'Subscription Plan';
            // Plan tag: _fmf suffix indicates first-month-free so the webhook knows to
            // credit the full N-month term despite charging only N-1 months.
            $invoicePlan = $isFirstMonthFree
                ? sprintf('%s_m%d_fmf', (string) $subscription->plan, $durationMonths)
                : sprintf('%s_m%d_b0', (string) $subscription->plan, $durationMonths);
        }

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
            'items' => [[
                'name' => $itemName,
                'quantity' => $isRoomAddon
                    ? $roomAddonQuantity * $durationMonths
                    // First-month-free: quantity = paid months (N-1); standard: quantity = N.
                    : ($isFirstMonthFree ? $durationMonths - 1 : max(1, $durationMonths)),
                'price' => $isRoomAddon
                    ? $slotMonthly
                    : $monthlyRate,
                'category' => 'Subscription',
            ]],
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

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->id,
            'resort_id' => $subscription->resort_id,
            'xendit_invoice_id' => $data['id'] ?? null,
            'xendit_invoice_url' => $data['invoice_url'] ?? null,
            'amount' => $chargeAmount,
            'plan' => $invoicePlan,
            'referral_code' => $storedReferralCode,
            'marketer_id' => $marketerId,
            'status' => 'pending',
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
        $message = is_array($errorBody) ? (string) ($errorBody['message'] ?? '') : '';
        $code = is_array($errorBody) ? (string) ($errorBody['error_code'] ?? '') : '';

        if ($status === 403 || $code === 'REQUEST_FORBIDDEN_ERROR') {
            return 'Xendit API key is forbidden for invoice creation. Check key permissions in Xendit Dashboard (Invoices write/create access).';
        }

        if ($status === 401) {
            return 'Xendit API key is invalid or unauthorized. Please verify XENDIT_SECRET_KEY.';
        }

        return $message !== ''
            ? "Subscription payment gateway error: {$message}"
            : 'Subscription payment gateway error. Please try again.';
    }

    private function shouldUseLocalMockOnForbidden(int $status, mixed $errorBody): bool
    {
        if (! $this->canUseLocalMockPaid() || ! (bool) config('services.xendit.local_mock_on_forbidden', false)) {
            return false;
        }

        $code = is_array($errorBody) ? (string) ($errorBody['error_code'] ?? '') : '';

        return $status === 403 || $code === 'REQUEST_FORBIDDEN_ERROR';
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
            'paid_at' => now(),
            'billing_cycle_start' => $subscription->billing_cycle_start,
            'billing_cycle_end' => $subscription->billing_cycle_end,
        ]);

        if ($billingScope === 'room_addon') {
            $subscription->included_rooms = max(0, (int) $subscription->included_rooms) + max(1, $roomAddonQuantity);
            $subscription->active_room_count = $subscription->resort
                ? $subscription->resort->rooms()->where('status', 'active')->count()
                : (int) $subscription->active_room_count;
            $subscription->total_monthly_fee = max(
                0,
                (float) $subscription->base_price
                + max(0, $subscription->active_room_count - (int) $subscription->included_rooms) * (float) $subscription->extra_room_fee
            );
            $subscription->status = 'active';
            $subscription->grace_until = null;
            $subscription->save();

            return [
                'invoice_id' => $mockInvoiceId,
                'invoice_url' => $successUrl,
                'subscription_invoice_id' => $invoice->id,
            ];
        }

        $newStart = $subscription->billing_cycle_end
            ? $subscription->billing_cycle_end->copy()->addDay()
            : now()->startOfMonth();
        // extractTermFromPlan returns [termMonths, isFmf].
        // For first-month-free the full term (N months) is credited even though only N-1 were charged.
        [$termMonths] = $this->extractTermFromPlan($invoicePlan);
        $newEnd = $newStart->copy()->addMonthsNoOverflow($termMonths)->subDay();

        $subscription->update([
            'billing_cycle_start' => $newStart->toDateString(),
            'billing_cycle_end' => $newEnd->toDateString(),
            'next_due_date' => $newEnd->toDateString(),
            'status' => 'active',
            'grace_until' => null,
        ]);

        app(SubscriptionReferralCommissionService::class)->creditFromPaidMonthlyInvoice($invoice);

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
     * Normalize optional browser origin for Xendit redirects. Falls back to FRONTEND_URL
     * when missing or not on the allowlist (prevents open redirects).
     */
    private function resolveCheckoutReturnBase(?string $requested): string
    {
        $default = rtrim((string) config('app.frontend_url', 'http://127.0.0.1:3000'), '/');
        if ($requested === null) {
            return $default;
        }
        $trimmed = trim($requested);
        if ($trimmed === '' || ! preg_match('#^https?://#i', $trimmed)) {
            return $default;
        }
        $parts = parse_url($trimmed);
        if (! is_array($parts) || empty($parts['host'])) {
            return $default;
        }
        if (! empty($parts['user']) || ! empty($parts['pass'])) {
            return $default;
        }
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if (! in_array($scheme, ['http', 'https'], true)) {
            return $default;
        }
        $host = strtolower((string) $parts['host']);
        if (! $this->isAllowedCheckoutReturnHost($host)) {
            return $default;
        }
        $port = isset($parts['port']) ? ':'.(int) $parts['port'] : '';

        return rtrim("{$scheme}://{$host}{$port}", '/');
    }

    private function isAllowedCheckoutReturnHost(string $host): bool
    {
        if ($host === 'localhost' || $host === '127.0.0.1') {
            return true;
        }
        if (str_ends_with($host, '.localhost')) {
            return true;
        }
        $frontendHost = parse_url((string) config('app.frontend_url', ''), PHP_URL_HOST);
        if (is_string($frontendHost) && $frontendHost !== '' && strcasecmp($host, $frontendHost) === 0) {
            return true;
        }
        $allow = config('app.checkout_return_hosts', []);
        if (is_array($allow)) {
            foreach ($allow as $h) {
                if (is_string($h) && strcasecmp($host, $h) === 0) {
                    return true;
                }
            }
        }

        return false;
    }

    private function monthlyRate(int $durationMonths): float
    {
        $standard = [1 => 2100.0, 3 => 1900.0, 6 => 1700.0, 12 => 1500.0];

        return $standard[$durationMonths] ?? $standard[1];
    }

    /**
     * Parse the invoice plan tag and return [termMonths, isFirstMonthFree].
     * For first-month-free (_fmf) plans the full term is credited even though
     * chargeAmount only covers N-1 months.
     * For legacy bonus (_b1) plans we preserve the old "+1 bonus" credit.
     *
     * @return array{0:int,1:bool}
     */
    private function extractTermFromPlan(string $invoicePlan): array
    {
        // New first-month-free tag: basic_m12_fmf
        if (preg_match('/_m(\d+)_fmf$/', $invoicePlan, $m) === 1) {
            return [max(1, (int) $m[1]), true];
        }
        // Legacy bonus tag: basic_m12_b1 (keep creditedMonths = paidMonths + bonusMonths)
        if (preg_match('/_m(\d+)_b(\d+)$/', $invoicePlan, $m) === 1) {
            $paidMonths = max(1, (int) $m[1]);
            $bonusMonths = max(0, (int) $m[2]);

            return [$paidMonths + $bonusMonths, false];
        }

        return [1, false];
    }
}
