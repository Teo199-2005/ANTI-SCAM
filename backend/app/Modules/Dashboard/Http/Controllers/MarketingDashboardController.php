<?php

namespace App\Modules\Dashboard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketingDashboardController extends Controller
{
    use ApiResponseTrait;

    public function stats(Request $request)
    {
        $marketerId = $request->user()->id;

        $totalCommissions = Commission::where('marketer_id', $marketerId)->sum('commission_amount');
        $pendingCommissions = Commission::where('marketer_id', $marketerId)->where('status', 'pending')->sum('commission_amount');
        $releasedCommissions = Commission::where('marketer_id', $marketerId)->where('status', 'released')->sum('commission_amount');
        $resortCount = DB::table('marketer_resorts')->where('marketer_id', $marketerId)->count();

        return $this->successResponse([
            'totalCommissions'   => (float) $totalCommissions,
            'pendingCommissions' => (float) $pendingCommissions,
            'releasedCommissions' => (float) $releasedCommissions,
            'assignedResorts'    => $resortCount,
        ], 'Marketing stats');
    }

    public function assignedResorts(Request $request)
    {
        $marketerId = $request->user()->id;

        $resorts = DB::table('marketer_resorts')
            ->where('marketer_resorts.marketer_id', $marketerId)
            ->join('resorts', 'resorts.id', '=', 'marketer_resorts.resort_id')
            ->select('resorts.id', 'resorts.name', 'resorts.address', 'resorts.is_publicly_listed', 'resorts.is_vip')
            ->get();

        return $this->successResponse($resorts, 'Assigned resorts fetched');
    }

    public function commissions(Request $request)
    {
        $marketerId = $request->user()->id;
        $perPage    = (int) $request->integer('perPage', 12);

        $commissions = Commission::with(['resort:id,name', 'releases'])
            ->where('marketer_id', $marketerId)
            ->latest()
            ->paginate($perPage);

        return $this->successResponse($commissions, 'Commissions fetched');
    }

    public function releaseHistory(Request $request)
    {
        $marketerId = $request->user()->id;
        $perPage    = (int) $request->integer('perPage', 12);

        $releases = CommissionRelease::with(['commission.resort:id,name', 'releasedByUser:id,name'])
            ->whereHas('commission', fn ($q) => $q->where('marketer_id', $marketerId))
            ->latest('released_at')
            ->paginate($perPage);

        return $this->successResponse($releases, 'Release history fetched');
    }
}
