<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Services\XenditPayoutWebhookService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class XenditPayoutWebhookController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly XenditPayoutWebhookService $service) {}

    public function payout(Request $request)
    {
        try {
            $this->service->verifySignature((string) $request->header('x-callback-token'));
            $this->service->handle($request->all());
        } catch (ValidationException $exception) {
            return $this->errorResponse('Webhook signature validation failed.', $exception->errors(), 401);
        }

        return $this->successResponse(null, 'Payout webhook processed');
    }
}
