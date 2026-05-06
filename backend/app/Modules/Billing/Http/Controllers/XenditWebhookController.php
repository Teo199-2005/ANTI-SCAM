<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Services\XenditWebhookService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class XenditWebhookController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly XenditWebhookService $service) {}

    public function invoice(Request $request)
    {
        try {
            $this->service->verifySignature((string) $request->header('x-callback-token'));
            $reservation = $this->service->handleInvoicePaid($request->all());
        } catch (ValidationException $exception) {
            return $this->errorResponse('Webhook signature validation failed.', $exception->errors(), 401);
        }

        return $this->successResponse($reservation, 'Webhook processed');
    }
}
