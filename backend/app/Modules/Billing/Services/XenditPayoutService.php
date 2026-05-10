<?php

namespace App\Modules\Billing\Services;

use App\Modules\Billing\Support\XenditTls;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class XenditPayoutService
{
    private function secretKey(): string
    {
        return (string) config('services.xendit.secret_key');
    }

    private function channelCode(): string
    {
        return (string) config('services.xendit.payout_channel_code', 'PH_GCASH');
    }

    public function isConfigured(): bool
    {
        return trim($this->secretKey()) !== '';
    }

    /**
     * @return array{id: string, status: string, reference_id: string}
     */
    public function createGcashPayout(
        string $referenceId,
        float $amount,
        string $accountNumber,
        string $accountHolderName,
        string $description = 'Marketing commission payout',
    ): array {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Xendit secret key is not configured.');
        }

        if ($amount <= 0) {
            throw new RuntimeException('Payout amount must be greater than zero.');
        }

        $payload = [
            'reference_id' => $referenceId,
            'channel_code' => $this->channelCode(),
            'channel_properties' => [
                'account_number' => $accountNumber,
                'account_holder_name' => $accountHolderName,
            ],
            'amount' => round($amount, 2),
            'currency' => 'PHP',
            'description' => mb_substr($description, 0, 100),
        ];

        try {
            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withHeaders([
                    'Idempotency-Key' => $referenceId,
                    'Content-Type' => 'application/json',
                ])
                ->withOptions(XenditTls::httpClientOptions())
                ->timeout(45)
                ->post('https://api.xendit.co/v2/payouts', $payload);
        } catch (ConnectionException $e) {
            if (app()->isProduction() || ! str_contains($e->getMessage(), 'cURL error 60')) {
                throw $e;
            }

            Log::warning('Xendit payout TLS verify failed locally; retrying with verify=false once.', [
                'reference_id' => $referenceId,
            ]);

            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withHeaders([
                    'Idempotency-Key' => $referenceId,
                    'Content-Type' => 'application/json',
                ])
                ->withOptions(['verify' => false])
                ->timeout(45)
                ->post('https://api.xendit.co/v2/payouts', $payload);
        }

        if (! $response->successful()) {
            $errorBody = $response->json();
            Log::error('Xendit payout creation failed', [
                'status' => $response->status(),
                'body' => $errorBody,
                'reference_id' => $referenceId,
            ]);
            throw new RuntimeException($this->buildGatewayErrorMessage($response->status(), $errorBody));
        }

        $data = $response->json();
        $id = (string) ($data['id'] ?? '');
        $status = (string) ($data['status'] ?? '');
        if ($id === '' || $status === '') {
            throw new RuntimeException('Xendit payout response missing id or status.');
        }

        return [
            'id' => $id,
            'status' => $status,
            'reference_id' => (string) ($data['reference_id'] ?? $referenceId),
        ];
    }

    /**
     * GET /v2/payouts/{payout_id} — used when webhooks omit amount or for polling stale batches.
     *
     * @return array<string, mixed>|null Decoded JSON body, or null if not found / error.
     */
    public function fetchPayoutById(string $payoutId): ?array
    {
        if (! $this->isConfigured() || $payoutId === '') {
            return null;
        }

        $url = 'https://api.xendit.co/v2/payouts/'.rawurlencode($payoutId);

        try {
            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withHeaders(['Content-Type' => 'application/json'])
                ->withOptions(XenditTls::httpClientOptions())
                ->timeout(45)
                ->get($url);
        } catch (ConnectionException $e) {
            if (app()->isProduction() || ! str_contains($e->getMessage(), 'cURL error 60')) {
                Log::warning('Xendit payout GET failed', [
                    'payout_id' => $payoutId,
                    'error' => $e->getMessage(),
                ]);

                return null;
            }

            $response = Http::withBasicAuth($this->secretKey(), '')
                ->withHeaders(['Content-Type' => 'application/json'])
                ->withOptions(['verify' => false])
                ->timeout(45)
                ->get($url);
        }

        if (! $response->successful()) {
            Log::warning('Xendit payout GET non-success', [
                'payout_id' => $payoutId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return null;
        }

        $data = $response->json();

        return is_array($data) ? $data : null;
    }

    private function buildGatewayErrorMessage(int $status, mixed $errorBody): string
    {
        $message = is_array($errorBody) ? (string) ($errorBody['message'] ?? '') : '';
        $code = is_array($errorBody) ? (string) ($errorBody['error_code'] ?? '') : '';

        if ($status === 403 || $code === 'REQUEST_FORBIDDEN_ERROR') {
            return 'Xendit API key is forbidden for payouts. Enable Payouts / Money Out permissions for this key in the Xendit Dashboard.';
        }

        if ($status === 401) {
            return 'Xendit API key is invalid or unauthorized. Please verify XENDIT_SECRET_KEY.';
        }

        return $message !== ''
            ? $message
            : 'Xendit payout request failed (HTTP '.$status.').';
    }
}
