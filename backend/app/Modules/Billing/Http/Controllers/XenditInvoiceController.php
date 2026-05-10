<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Modules\Billing\Services\XenditInvoiceService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use RuntimeException;

class XenditInvoiceController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly XenditInvoiceService $service) {}

    public function create(Request $request, Reservation $reservation)
    {
        $this->authorize('view', $reservation);

        try {
            $result = $this->service->resolveGuestCheckoutInvoice($reservation, $request->user());
        } catch (RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'not awaiting payment') ? 409 : 502;

            return $this->errorResponse($e->getMessage(), null, $status);
        }

        $message = match (true) {
            $result['already_confirmed'] => 'Payment already recorded; reservation confirmed.',
            $result['resumed'] => 'Resume payment on the existing Xendit checkout.',
            default => 'Payment invoice ready.',
        };

        return $this->successResponse($result, $message);
    }
}
