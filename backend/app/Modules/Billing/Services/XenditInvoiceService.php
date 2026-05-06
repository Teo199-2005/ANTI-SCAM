<?php

namespace App\Modules\Billing\Services;

use App\Models\Reservation;
use App\Models\User;
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

        if (! $this->isConfigured()) {
            // Dev / sandbox mode — return a pass-through mock so the flow can be tested end-to-end.
            $mockInvoiceId = 'mock-inv-' . $reservation->reference_no;
            return [
                'invoice_id'  => $mockInvoiceId,
                'invoice_url' => $successUrl,   // redirect straight to success in dev
            ];
        }

        $response = Http::withBasicAuth($this->secretKey(), '')
            ->timeout(30)
            ->post('https://api.xendit.co/v2/invoices', [
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
            ]);

        if (! $response->successful()) {
            Log::error('Xendit invoice creation failed', [
                'status'         => $response->status(),
                'body'           => $response->json(),
                'reservation_id' => $reservation->id,
            ]);
            throw new RuntimeException('Payment gateway error. Please try again.');
        }

        $data = $response->json();

        return [
            'invoice_id'  => $data['id'],
            'invoice_url' => $data['invoice_url'],
        ];
    }
}
