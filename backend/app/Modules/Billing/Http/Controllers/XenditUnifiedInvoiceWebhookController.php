<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Services\XenditSubscriptionWebhookService;
use App\Modules\Billing\Services\XenditWebhookService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Single URL for Xendit legacy "INVOICES" webhook (paid, expired, payment after expiry).
 * Dispatches to booking and subscription handlers by matching xendit_invoice_id.
 */
class XenditUnifiedInvoiceWebhookController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly XenditWebhookService $bookingWebhooks,
        private readonly XenditSubscriptionWebhookService $subscriptionWebhooks,
    ) {}

    public function handle(Request $request)
    {
        try {
            $this->bookingWebhooks->verifySignature((string) $request->header('x-callback-token'));
            $payload = $request->all();

            $reservation = $this->bookingWebhooks->handleInvoicePaid($payload);
            $subscriptionInvoice = $this->subscriptionWebhooks->handleInvoiceWebhook($payload);
        } catch (ValidationException $exception) {
            return $this->errorResponse('Webhook signature validation failed.', $exception->errors(), 401);
        }

        return $this->successResponse([
            'reservation_id' => $reservation?->id,
            'subscription_invoice_id' => $subscriptionInvoice?->id,
        ], 'Invoice webhook processed');
    }
}
