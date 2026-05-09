<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Services\XenditSubscriptionWebhookService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SubscriptionWebhookController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly XenditSubscriptionWebhookService $service) {}

    public function invoice(Request $request)
    {
        try {
            $this->service->verifySignature((string) $request->header('x-callback-token'));
            $invoice = $this->service->handleInvoiceWebhook($request->all());
        } catch (ValidationException $exception) {
            return $this->errorResponse('Webhook signature validation failed.', $exception->errors(), 401);
        }

        return $this->successResponse($invoice, 'Subscription webhook processed');
    }
}

