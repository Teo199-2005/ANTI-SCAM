<?php

namespace App\Modules\Billing\Services;

use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\User;
use App\Modules\Billing\Support\SubscriptionBillingMode;
use App\Modules\Billing\Support\SubscriptionInvoicePlanTag;
use App\Modules\Billing\Support\XenditTls;
use App\Support\PricingPilot;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class XenditRecurringSubscriptionService
{
    public function __construct(
        private readonly XenditSubscriptionInvoiceService $invoices,
    ) {}

    public function recurringEnabled(): bool
    {
        return (bool) config('xendit_recurring.enabled', false)
            && ! PricingPilot::enabled()
            && $this->invoices->gatewayConfigured();
    }

    /**
     * @return list<string>
     */
    public function resolveCheckoutPaymentMethods(?string $paymentMethod): array
    {
        if ($paymentMethod === null || $paymentMethod === '') {
            return [];
        }

        $method = strtoupper(trim($paymentMethod));
        $recurringMethods = config('xendit_recurring.recurring_payment_methods', ['CREDIT_CARD']);

        if (in_array($method, $recurringMethods, true)) {
            return [$method];
        }

        $manual = config('xendit_recurring.manual_payment_methods', []);

        return in_array($method, $manual, true) ? [$method] : [$method];
    }

    public function shouldSetupRecurringOnCheckout(?string $paymentMethod, string $billingScope): bool
    {
        if ($billingScope !== 'monthly' || ! $this->recurringEnabled()) {
            return false;
        }

        $method = strtoupper(trim((string) $paymentMethod));

        return in_array($method, config('xendit_recurring.recurring_payment_methods', ['CREDIT_CARD']), true);
    }

    public function activateRecurringAfterFirstPaid(SubscriptionInvoice $invoice): void
    {
        if (! $this->recurringEnabled()) {
            return;
        }

        if (! SubscriptionInvoicePlanTag::requestsRecurringSetup((string) $invoice->plan)) {
            return;
        }

        $subscription = $invoice->subscription;
        if (! $subscription) {
            return;
        }

        if (SubscriptionBillingMode::recurringActive($subscription->billing_mode, $subscription->recurring_cancelled_at)) {
            return;
        }

        if ($subscription->xendit_recurring_plan_id) {
            return;
        }

        $durationMonths = SubscriptionInvoicePlanTag::creditedMonthsFromPlan((string) $invoice->plan);
        $durationMonths = in_array($durationMonths, [1, 3, 6, 12], true) ? $durationMonths : 1;

        $paymentTokenId = $this->resolvePaymentTokenFromPaidInvoice($invoice);
        if ($paymentTokenId === null) {
            Log::warning('Subscription recurring setup skipped: no payment_token_id on paid invoice.', [
                'subscription_id' => $subscription->id,
                'invoice_id' => $invoice->id,
            ]);

            return;
        }

        $customerId = $this->ensureXenditCustomer($subscription);
        $amount = $this->invoices->resolveChargeAmount($subscription, 'monthly', 1, $durationMonths);
        $anchorDate = $subscription->billing_cycle_end
            ? $subscription->billing_cycle_end->copy()->addDay()->startOfDay()->toIso8601String()
            : now()->addDay()->startOfDay()->toIso8601String();

        $planId = $this->createRecurringPlan(
            $subscription,
            $customerId,
            $paymentTokenId,
            $amount,
            $durationMonths,
            $anchorDate,
        );

        if ($planId === null) {
            return;
        }

        $subscription->update([
            'billing_mode' => SubscriptionBillingMode::AUTO_CARD,
            'renewal_duration_months' => $durationMonths,
            'xendit_customer_id' => $customerId,
            'xendit_recurring_plan_id' => $planId,
            'xendit_payment_method_id' => $paymentTokenId,
            'recurring_activated_at' => now(),
            'recurring_cancelled_at' => null,
        ]);
    }

    public function cancelRecurring(Subscription $subscription): void
    {
        $planId = (string) ($subscription->xendit_recurring_plan_id ?? '');
        if ($planId !== '' && $this->recurringEnabled()) {
            $this->deactivateRecurringPlan($planId);
        }

        $subscription->update([
            'billing_mode' => SubscriptionBillingMode::MANUAL,
            'recurring_cancelled_at' => now(),
        ]);
    }

    private function resolvePaymentTokenFromPaidInvoice(SubscriptionInvoice $invoice): ?string
    {
        $xenditId = (string) ($invoice->xendit_invoice_id ?? '');
        if ($xenditId === '' || str_starts_with($xenditId, 'mock-')) {
            if (app()->environment('local', 'testing')) {
                return 'pt_mock_'.$invoice->subscription_id;
            }

            return null;
        }

        $details = $this->invoices->fetchXenditInvoicePayload($xenditId);
        if ($details === null) {
            return null;
        }

        $candidates = [
            Arr::get($details, 'payment_token_id'),
            Arr::get($details, 'payment_details.payment_token_id'),
            Arr::get($details, 'payment_method.payment_token_id'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && $candidate !== '') {
                return $candidate;
            }
        }

        $payments = Arr::get($details, 'payments', []);
        if (is_array($payments)) {
            foreach ($payments as $payment) {
                if (! is_array($payment)) {
                    continue;
                }
                $token = $payment['payment_token_id'] ?? $payment['payment_detail']['payment_token_id'] ?? null;
                if (is_string($token) && $token !== '') {
                    return $token;
                }
            }
        }

        return null;
    }

    private function ensureXenditCustomer(Subscription $subscription): string
    {
        if (is_string($subscription->xendit_customer_id) && $subscription->xendit_customer_id !== '') {
            return $subscription->xendit_customer_id;
        }

        $owner = User::withoutGlobalScopes()
            ->where('tenant_id', $subscription->tenant_id)
            ->where('role', 'resort_owner')
            ->first();

        if (! $owner) {
            throw new RuntimeException('No resort owner found for recurring customer setup.');
        }

        $referenceId = 'sub-cust-'.$subscription->id;
        $body = [
            'reference_id' => $referenceId,
            'type' => 'INDIVIDUAL',
            'email' => $owner->email,
            'individual_detail' => [
                'given_names' => $owner->name,
            ],
        ];

        $response = $this->xenditRequest('post', 'https://api.xendit.co/customers', $body, 'customer-'.$subscription->id);

        if (! $response->successful()) {
            Log::error('Xendit customer creation failed', [
                'subscription_id' => $subscription->id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            throw new RuntimeException('Could not create payment customer for auto-renewal.');
        }

        $customerId = (string) ($response->json('id') ?? '');
        if ($customerId === '') {
            throw new RuntimeException('Payment gateway returned an invalid customer id.');
        }

        $subscription->update(['xendit_customer_id' => $customerId]);

        return $customerId;
    }

    private function createRecurringPlan(
        Subscription $subscription,
        string $customerId,
        string $paymentTokenId,
        float $amount,
        int $durationMonths,
        string $anchorDate,
    ): ?string {
        $referenceId = 'sub-recurring-'.$subscription->id;

        $body = [
            'reference_id' => $referenceId,
            'customer_id' => $customerId,
            'currency' => 'PHP',
            'amount' => round($amount, 2),
            'payment_tokens' => [
                ['payment_token_id' => $paymentTokenId, 'rank' => 1],
            ],
            'schedule' => [
                'interval' => 'MONTH',
                'interval_count' => $durationMonths,
                'anchor_date' => $anchorDate,
                'total_recurrence' => null,
                'retry_interval' => 'DAY',
                'retry_interval_count' => 1,
                'total_retry' => 3,
            ],
            'immediate_payment' => false,
            'failed_cycle_action' => 'STOP',
            'description' => sprintf('ResortStaycation subscription · resort #%d', $subscription->resort_id),
            'metadata' => [
                'subscription_id' => (string) $subscription->id,
                'resort_id' => (string) $subscription->resort_id,
            ],
        ];

        $response = $this->xenditRequest(
            'post',
            'https://api.xendit.co/recurring/plans',
            $body,
            'recurring-plan-'.$subscription->id,
        );

        if (! $response->successful() && $response->status() !== 202) {
            Log::error('Xendit recurring plan creation failed', [
                'subscription_id' => $subscription->id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return null;
        }

        $planId = (string) ($response->json('id') ?? '');
        if ($planId === '') {
            Log::warning('Xendit recurring plan accepted without id in response', [
                'subscription_id' => $subscription->id,
                'body' => $response->json(),
            ]);

            return null;
        }

        return $planId;
    }

    private function deactivateRecurringPlan(string $planId): void
    {
        $url = 'https://api.xendit.co/recurring/plans/'.rawurlencode($planId);
        $response = $this->xenditRequest('patch', $url, ['status' => 'INACTIVE'], 'recurring-deactivate-'.$planId);

        if (! $response->successful() && $response->status() !== 404) {
            Log::warning('Xendit recurring plan deactivation returned non-success', [
                'plan_id' => $planId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function xenditRequest(string $method, string $url, array $body, string $idempotencyKey): \Illuminate\Http\Client\Response
    {
        $secret = (string) config('services.xendit.secret_key');
        $headers = [
            'Idempotency-key' => $idempotencyKey,
            'api-version' => (string) config('xendit_recurring.api_version', '2026-01-01'),
        ];

        try {
            return Http::withBasicAuth($secret, '')
                ->withHeaders($headers)
                ->withOptions(XenditTls::httpClientOptions())
                ->timeout(30)
                ->{$method}($url, $body);
        } catch (ConnectionException $e) {
            if (app()->isProduction() || ! str_contains($e->getMessage(), 'cURL error 60')) {
                throw $e;
            }

            return Http::withBasicAuth($secret, '')
                ->withHeaders($headers)
                ->withOptions(['verify' => false])
                ->timeout(30)
                ->{$method}($url, $body);
        }
    }
}
