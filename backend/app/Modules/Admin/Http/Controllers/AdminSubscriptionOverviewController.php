<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Models\SubscriptionInvoice;
use App\Services\PhilippineLocationService;
use App\Support\ResortLocationQuery;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminSubscriptionOverviewController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $loc = app(PhilippineLocationService::class);
        $location = ResortLocationQuery::fromRequest($request);

        $resortQuery = Resort::withoutGlobalScopes()
            ->with('subscription')
            ->orderBy('name');

        ResortLocationQuery::applyToResortColumns(
            $resortQuery,
            $location['province_psgc'],
            $location['city_municipality_psgc'],
        );

        $resorts = $resortQuery->get([
                'id',
                'tenant_id',
                'name',
                'description',
                'address_province_psgc',
                'address_city_municipality_psgc',
                'address_barangay_psgc',
                'address_barangay_name',
                'address_label',
                'contact_number',
                'logo_url',
                'is_publicly_listed',
                'is_vip',
                'created_at',
                'updated_at',
            ]);

        $latestInvoiceIds = SubscriptionInvoice::withoutGlobalScopes()
            ->select('resort_id', DB::raw('MAX(id) as latest_id'))
            ->groupBy('resort_id');

        $latestStatuses = SubscriptionInvoice::withoutGlobalScopes()
            ->joinSub($latestInvoiceIds, 'latest', function ($join): void {
                $join->on('subscription_invoices.id', '=', 'latest.latest_id');
            })
            ->pluck('subscription_invoices.status', 'subscription_invoices.resort_id');

        $payload = $resorts->map(function (Resort $resort) use ($latestStatuses): array {
            return [
                'id' => $resort->id,
                'tenant_id' => $resort->tenant_id,
                'name' => $resort->name,
                'description' => $resort->description,
                'address' => $loc->resortDisplayLine($resort),
                'contact_number' => $resort->contact_number,
                'logo_url' => $resort->logo_url,
                'is_publicly_listed' => (bool) $resort->is_publicly_listed,
                'is_vip' => (bool) $resort->is_vip,
                'created_at' => $resort->created_at,
                'updated_at' => $resort->updated_at,
                'subscription' => $resort->subscription,
                'latest_invoice_status' => $latestStatuses[$resort->id] ?? 'none',
            ];
        })->values();

        return $this->successResponse($payload, 'Subscription overview fetched');
    }
}

