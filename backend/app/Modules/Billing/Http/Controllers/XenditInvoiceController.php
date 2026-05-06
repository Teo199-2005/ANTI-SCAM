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

        if ($reservation->status !== 'pending_payment') {
            return $this->errorResponse(
                'Reservation is not awaiting payment.',
                ['reservation' => ['not_payable']],
                409
            );
        }

        if ($reservation->xendit_invoice_id) {
            return $this->errorResponse(
                'A payment invoice already exists for this reservation.',
                ['reservation' => ['invoice_exists']],
                409
            );
        }

        try {
            $result = $this->service->createInvoice($reservation, $request->user());
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), null, 502);
        }

        $reservation->update(['xendit_invoice_id' => $result['invoice_id']]);

        return $this->successResponse([
            'invoice_url' => $result['invoice_url'],
            'invoice_id'  => $result['invoice_id'],
        ], 'Payment invoice created');
    }
}
