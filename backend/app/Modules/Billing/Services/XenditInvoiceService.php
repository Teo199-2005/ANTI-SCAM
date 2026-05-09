<?php

namespace App\Modules\Billing\Services;

use App\Modules\Billing\Support\XenditTls;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class XenditInvoiceService
{
    private function secretKey(): string
    {
        return (string) config('services.xendit.secret_key');
    }

    private function isConfigured(): bool
    {
        return $this->secretKey() !== '';
    }

    public function createInvoice(Reservation $reservation, User $user): array
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');
        $successUrl  = "{$frontendUrl}/payment/success?reservation_id={$reservation->id}&ref={$reservation->reference_no}";
        $failureUrl  = "{$frontendUrl}/payment/failed?reservation_id={$reservation->id}&ref={$reservation->reference_no}";

        if (! $this->isConfigured() && app()->isProduction()) {
            throw new RuntimeException('Xendit secret key is not configured.');
        }

        if (! $this->isConfigured()) {
            if (! app()->isProduction() && (bool) config('services.xendit.allow_mock_paid', false)) {
                // Explicit local testing override only (disabled by default).
                $mockInvoiceId = 'mock-inv-' . $reservation->reference_no;
                return [
                    'invoice_id'  => $mockInvoiceId,
                    'invoice_url' => $successUrl,
                ];
            }

            throw new RuntimeException('Xendit secret key is missing. Payment cannot proceed until gateway is configured.');
        }

        $payload = [
            'external_id'          => $reservation->reference_no,
            'amount'               => (float) $reservation->reservation_fee,
            'description'          => "Reservation fee — {$reservation->reference_no}",
            'currency'             => 'PHP',
            'invoice_duration'     => 600, // 10 minutes, matches the booking lock
            'customer'             => [
                'given_names' => $user->name,
                'email'       => $user->email,
            ],
            'success_redirect_url' => $successUrl,
            'failure_redirect_url' => $failureUrl,
            'items'                => [[
                'name'     => 'Resort Reservation Fee (Non-Refundable)',
                'quantity' => 1,
                'price'    => (float) $reservation->reservation_fee,
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
                'status'         => $response->status(),
                'body'           => $errorBody,
                'reservation_id' => $reservation->id,
            ]);
            throw new RuntimeException($this->buildGatewayErrorMessage($response->status(), $errorBody));
        }

        $data = $response->json();

        return [
            'invoice_id'  => $data['id'],
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
