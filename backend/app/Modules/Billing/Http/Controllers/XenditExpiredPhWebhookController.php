<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Services\XenditExpiredPhWebhookService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class XenditExpiredPhWebhookController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly XenditExpiredPhWebhookService $service) {}

    /**
     * POST /api/v1/webhooks/xendit/expired-ph
     * Also reachable as /expired_xendit_ph.php (see public/expired_xendit_ph.php).
     */
    public function handle(Request $request)
    {
        try {
            $this->service->verifySignature((string) $request->header('x-callback-token'));
            $result = $this->service->handle($request->all());
        } catch (ValidationException $exception) {
            return $this->errorResponse('Webhook signature validation failed.', $exception->errors(), 401);
        }

        if ($result['ignored'] ?? false) {
            return $this->successResponse($result, 'Webhook ignored (not an expired or failed invoice).');
        }

        return $this->successResponse($result, 'Expired/failed Xendit invoice webhook processed');
    }
}
