<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\XenditWebhookEvent;
use App\Shared\Traits\ApiResponseTrait;

class XenditLogController extends Controller
{
    use ApiResponseTrait;

    public function index()
    {
        $perPage  = (int) request()->integer('perPage', 20);
        $status   = request()->string('status')->value();
        $invoiceId = request()->string('invoice_id')->value();

        $logs = XenditWebhookEvent::query()
            ->when($status, fn ($q) => $q->where('event_type', $status))
            ->when($invoiceId, fn ($q) => $q->where('invoice_id', 'like', "%{$invoiceId}%"))
            ->latest('processed_at')
            ->paginate($perPage);

        return $this->successResponse($logs, 'Xendit logs fetched');
    }
}
