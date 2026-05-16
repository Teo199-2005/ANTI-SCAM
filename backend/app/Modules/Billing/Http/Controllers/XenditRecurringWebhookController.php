<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Services\XenditRecurringWebhookService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class XenditRecurringWebhookController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly XenditRecurringWebhookService $service) {}

    public function handle(Request $request)
    {
        try {
            $this->service->verifySignature((string) $request->header('x-callback-token'));
            $invoice = $this->service->handle($request->all());
        } catch (ValidationException $exception) {
            return $this->errorResponse('Webhook signature validation failed.', $exception->errors(), 401);
        }

        return $this->successResponse($invoice, 'Recurring subscription webhook processed');
    }
}
