<?php

namespace App\Modules\Billing\Services;

use App\Models\Reservation;
use App\Models\User;
use App\Modules\Billing\Support\CheckoutReturnBaseResolver;
use App\Modules\Billing\Support\XenditTls;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class XenditInvoiceService
{
    public function __construct(
        private readonly XenditWebhookService $webhooks,
        private readonly CheckoutReturnBaseResolver $checkoutReturnBase,
    ) {}

    private function secretKey(): string
    {
        return (string) config('services.xendit.secret_key');
    }

    private function isConfigured(): bool
    {
        return $this->secretKey() !== '';
    }

    /**
     * Fetch raw invoice JSON from Xendit (booking / guest checkout invoices).
     *
     * @return array<string, mixed>|null
     */
    public function fetchInvoicePayload(string $xenditInvoiceId): ?array
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
                Log::warning('Xendit booking invoice fetch connection error', [
                    'invoice_id' => $xenditInvoiceId,
                    'message' => $e->getMessage(),
                ]);

                return null;
            }

            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withOptions(['verify' => false])
                ->timeout(30)
                ->get($url);
        }

        if (! $response->successful()) {
            Log::warning('Xendit booking invoice fetch failed', [
                'invoice_id' => $xenditInvoiceId,
                'status' => $response->status(),
            ]);

            return null;
        }

        $data = $response->json();

        return is_array($data) ? $data : null;
    }

    /**
     * Idempotent guest checkout: create invoice, resume PENDING checkout URL, sync PAID from Xendit,
     * or replace an EXPIRED/FAILED invoice with a new one.
     *
     * @return array{invoice_url: string|null, invoice_id: string, already_confirmed: bool, resumed: bool}
     */
    public function resolveGuestCheckoutInvoice(Reservation $reservation, User $user, ?string $checkoutReturnBase = null): array
    {
        return DB::transaction(function () use ($reservation, $user, $checkoutReturnBase): array {
            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'pending_payment') {
                throw new RuntimeException('Reservation is not awaiting payment.');
            }

            if (! $locked->xendit_invoice_id) {
                $created = $this->createInvoice($locked, $user, $checkoutReturnBase);
                $locked->update(['xendit_invoice_id' => $created['invoice_id']]);

                return [
                    'invoice_url' => $created['invoice_url'],
                    'invoice_id' => $created['invoice_id'],
                    'already_confirmed' => false,
                    'resumed' => false,
                ];
            }

            return $this->reconcileExistingGuestInvoice($locked, $user, $checkoutReturnBase);
        });
    }

    /**
     * @return array{invoice_url: string|null, invoice_id: string, already_confirmed: bool, resumed: bool}
     */
    private function reconcileExistingGuestInvoice(Reservation $locked, User $user, ?string $checkoutReturnBase = null): array
    {
        $id = (string) $locked->xendit_invoice_id;

        if (! $this->isConfigured() && ! app()->isProduction() && str_starts_with($id, 'mock-inv-')) {
            $base = $this->checkoutReturnBase->resolve($checkoutReturnBase);
            $urls = $this->bookingInvoiceReturnUrls($locked, $user, $base);

            return [
                'invoice_url' => $urls['success'],
                'invoice_id' => $id,
                'already_confirmed' => false,
                'resumed' => true,
            ];
        }

        $payload = $this->fetchInvoicePayload($id);
        if ($payload === null) {
            throw new RuntimeException('Unable to verify the payment session with Xendit. Please try again in a moment.');
        }

        $status = strtoupper((string) ($payload['status'] ?? ''));

        if ($status === 'PAID') {
            $payload['event'] = 'invoice.paid';
            $this->webhooks->handleInvoicePaid($payload);
            $locked->refresh();

            return [
                'invoice_url' => null,
                'invoice_id' => $id,
                'already_confirmed' => true,
                'resumed' => false,
            ];
        }

        if (in_array($status, ['EXPIRED', 'FAILED'], true)) {
            $locked->update(['xendit_invoice_id' => null]);
            $created = $this->createInvoice($locked, $user, $checkoutReturnBase);
            $locked->update(['xendit_invoice_id' => $created['invoice_id']]);

            return [
                'invoice_url' => $created['invoice_url'],
                'invoice_id' => $created['invoice_id'],
                'already_confirmed' => false,
                'resumed' => false,
            ];
        }

        $url = (string) ($payload['invoice_url'] ?? '');
        if ($url === '') {
            throw new RuntimeException('Checkout is still pending but no payment URL is available. Please contact support.');
        }

        return [
            'invoice_url' => $url,
            'invoice_id' => $id,
            'already_confirmed' => false,
            'resumed' => true,
        ];
    }

    /**
     * Xendit redirect URLs after booking invoice pay / fail. Guest and client land on dashboard with a modal;
     * other roles keep marketing payment pages (stay aligned with frontend `postPaymentDashboardReturnHref`).
     *
     * @return array{success: string, failure: string}
     */
    private function bookingInvoiceReturnUrls(Reservation $reservation, User $user, string $frontendBase): array
    {
        $frontendUrl = rtrim($frontendBase, '/');
        $role = (string) ($user->role ?? '');

        if ($role === 'guest' || $role === 'client') {
            $path = $role === 'guest' ? '/dashboard/guest/history' : '/dashboard/client/bookings';
            $successQuery = http_build_query([
                'from' => 'payment',
                'reservation_id' => (string) $reservation->id,
                'ref' => $reservation->reference_no,
            ]);
            $failureQuery = http_build_query([
                'from' => 'payment_failed',
                'reservation_id' => (string) $reservation->id,
                'ref' => $reservation->reference_no,
            ]);

            return [
                'success' => "{$frontendUrl}{$path}?{$successQuery}",
                'failure' => "{$frontendUrl}{$path}?{$failureQuery}",
            ];
        }

        $legacyQuery = http_build_query([
            'reservation_id' => (string) $reservation->id,
            'ref' => $reservation->reference_no,
        ]);

        return [
            'success' => "{$frontendUrl}/payment/success?{$legacyQuery}",
            'failure' => "{$frontendUrl}/payment/failed?{$legacyQuery}",
        ];
    }

    public function createInvoice(Reservation $reservation, User $user, ?string $checkoutReturnBase = null): array
    {
        $base = $this->checkoutReturnBase->resolve($checkoutReturnBase);
        $urls = $this->bookingInvoiceReturnUrls($reservation, $user, $base);
        $successUrl = $urls['success'];
        $failureUrl = $urls['failure'];

        if (! $this->isConfigured() && app()->isProduction()) {
            throw new RuntimeException('Xendit secret key is not configured.');
        }

        if (! $this->isConfigured()) {
            if (! app()->isProduction() && (bool) config('services.xendit.allow_mock_paid', false)) {
                // Explicit local testing override only (disabled by default).
                $mockInvoiceId = 'mock-inv-'.$reservation->reference_no;

                return [
                    'invoice_id' => $mockInvoiceId,
                    'invoice_url' => $successUrl,
                ];
            }

            throw new RuntimeException('Xendit secret key is missing. Payment cannot proceed until gateway is configured.');
        }

        $payload = [
            'external_id' => $reservation->reference_no,
            'amount' => (float) $reservation->reservation_fee,
            'description' => "Reservation fee — {$reservation->reference_no}",
            'currency' => 'PHP',
            'invoice_duration' => 600, // 10 minutes, matches the booking lock
            'customer' => [
                'given_names' => $user->name,
                'email' => $user->email,
            ],
            'success_redirect_url' => $successUrl,
            'failure_redirect_url' => $failureUrl,
            'items' => [[
                'name' => 'Resort Reservation Fee (Non-Refundable)',
                'quantity' => 1,
                'price' => (float) $reservation->reservation_fee,
                'category' => 'Reservation',
            ]],
        ];

        try {
            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withOptions(XenditTls::httpClientOptions())
                ->timeout(30)
                ->post('https://api.xendit.co/v2/invoices', $payload);
        } catch (ConnectionException $e) {
            // Windows local fallback for cURL error 60 (missing local CA bundle).
            if (app()->isProduction() || ! str_contains($e->getMessage(), 'cURL error 60')) {
                throw $e;
            }

            Log::warning('Xendit TLS verify failed locally; retrying with verify=false once.', [
                'reservation_id' => $reservation->id,
            ]);

            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withOptions(['verify' => false])
                ->timeout(30)
                ->post('https://api.xendit.co/v2/invoices', $payload);
        }

        if (! $response->successful()) {
            $errorBody = $response->json();
            Log::error('Xendit invoice creation failed', [
                'status' => $response->status(),
                'body' => $errorBody,
                'reservation_id' => $reservation->id,
            ]);
            throw new RuntimeException($this->buildGatewayErrorMessage($response->status(), $errorBody));
        }

        $data = $response->json();

        return [
            'invoice_id' => $data['id'],
            'invoice_url' => $data['invoice_url'],
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
            ? "Payment gateway error: {$message}"
            : 'Payment gateway error. Please try again.';
    }
}
