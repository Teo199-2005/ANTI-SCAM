<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Models\Subscription;
use App\Services\PhilippineLocationService;
use App\Shared\Traits\ApiResponseTrait;

class SuspensionController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly PhilippineLocationService $locations,
    ) {}

    public function index()
    {
        $perPage = (int) request()->integer('perPage', 20);
        $filter  = request()->string('filter', 'all')->value(); // all|suspended|grace_period

        $query = Subscription::with([
            'resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc,is_vip',
        ])
            ->whereIn('status', ['suspended', 'grace_period'])
            ->when($filter !== 'all', fn ($q) => $q->where('status', $filter))
            ->latest('updated_at');

        $results = $query->paginate($perPage);

        $results->setCollection($results->getCollection()->map(fn (Subscription $s) => [
            'subscriptionId'  => $s->id,
            'plan'            => $s->plan,
            'status'          => $s->status,
            'nextDueDate'     => $s->next_due_date,
            'graceUntil'      => $s->grace_until,
            'totalMonthlyFee' => $s->total_monthly_fee,
            'resort'          => $s->resort ? [
                'id'      => $s->resort->id,
                'name'    => $s->resort->name,
                'address' => $s->resort ? $this->locations->resortDisplayLine($s->resort) : null,
                'isVip'   => $s->resort->is_vip,
            ] : null,
        ]));

        return $this->successResponse($results, 'Suspension list fetched');
    }
}
