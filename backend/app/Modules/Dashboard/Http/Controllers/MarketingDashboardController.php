<?php

namespace App\Modules\Dashboard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\SubscriptionInvoice;
use App\Models\User;
use App\Services\MarketerCommissionPayoutService;
use App\Services\MarketerTierService;
use App\Services\PhilippineLocationService;
use App\Shared\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketingDashboardController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly MarketerCommissionPayoutService $marketerPayouts,
        private readonly MarketerTierService $marketerTiers,
    ) {}

    public function stats(Request $request)
    {
        $marketerId = $request->user()->id;

        $totalCommissions = Commission::where('marketer_id', $marketerId)->sum('commission_amount');
        $pendingCommissions = Commission::where('marketer_id', $marketerId)->where('status', 'pending')->sum('commission_amount');
        $pendingRows = Commission::where('marketer_id', $marketerId)->where('status', 'pending')->orderBy('id')->get();
        $pendingPayoutNetEstimate = $pendingRows->isEmpty()
            ? 0.0
            : (float) $this->marketerPayouts->allocateNetByCommission($pendingRows)['net_total'];

        $releasedCommissionsPaidOut = (float) CommissionRelease::query()
            ->whereHas('commission', fn ($q) => $q->where('marketer_id', $marketerId))
            ->sum('amount');
        $releasedCommissionsGross = Commission::where('marketer_id', $marketerId)->where('status', 'released')->sum('commission_amount');

        $resortCount = DB::table('marketer_resorts')->where('marketer_id', $marketerId)->count();

        $convertingClientsCount = $this->marketerTiers->countConvertingClients($marketerId);
        $convertingResortsWithReferralCount = $this->marketerTiers->countDistinctReferredResorts($marketerId);
        $marketerTier = $this->marketerTiers->resolveTier($convertingClientsCount);
        $tierLadder = $this->marketerTiers->tierLadder();
        $tierPolicy = $this->marketerTiers->tierPolicySummary();

        $user = $request->user();
        $frontend = $this->publicRegistrationBaseUrl($request);
        $code = $user->referral_code;
        $shareRegister = $code !== null && $code !== '' ? "{$frontend}/register?ref=".rawurlencode((string) $code) : null;
        $subscribeHint = $code !== null && $code !== ''
            ? "Resort owners who enter code {$code} at checkout get their first month free (3, 6, or 12-month plans) — after completing their resort profile setup."
            : null;

        $wh = $this->marketerPayouts->withholdingRate();

        return $this->successResponse([
            'totalCommissions' => (float) $totalCommissions,
            'pendingCommissions' => (float) $pendingCommissions,
            'pendingPayoutNetEstimate' => round($pendingPayoutNetEstimate, 2),
            'releasedCommissions' => round($releasedCommissionsPaidOut, 2),
            'releasedCommissionsGross' => (float) $releasedCommissionsGross,
            'payoutWithholdingRate' => $wh,
            'assignedResorts' => $resortCount,
            'convertingClientsCount' => $convertingClientsCount,
            'convertingResortsWithReferralCount' => $convertingResortsWithReferralCount,
            'marketerTier' => $marketerTier === null ? null : [
                'tierKey' => $marketerTier['tier_key'],
                'label' => $marketerTier['label'],
                'perPaymentPhp' => $marketerTier['per_payment_php'],
                'minClients' => $marketerTier['min_clients'],
                'maxClients' => $marketerTier['max_clients'],
                'nextTierAt' => $marketerTier['next_tier_at'],
                'clientsToNextTier' => $marketerTier['clients_to_next_tier'],
            ],
            'tierLadder' => array_map(static fn (array $b): array => [
                'tierKey' => $b['tier_key'],
                'label' => $b['label'],
                'minClients' => $b['min_clients'],
                'maxClients' => $b['max_clients'],
                'perPaymentPhp' => $b['per_payment_php'],
                'clientRangeLabel' => $b['client_range_label'],
            ], $tierLadder),
            'tierPolicy' => $tierPolicy,
            'referral_code' => $code,
            'referral_share_register_url' => $shareRegister,
            'referral_subscribe_hint' => $subscribeHint,
            'commission_payout_schedule' => 'Pending subscription-referral commissions are paid automatically via GCash (Xendit) on the 10th of each month (Asia/Manila), for earnings through the previous calendar month, when automation is enabled and payout details are complete. A platform withholding (taxes and fees) is deducted before each disbursement; see payoutWithholdingRate.',
        ], 'Marketing stats');
    }

    /**
     * Resort-owner organizations (tenants) that have paid qualifying subscription invoices with this marketer's referral.
     * Multiple invoices or resorts under the same tenant appear as one row; counts explain activity.
     */
    public function clients(Request $request)
    {
        $marketerId = $request->user()->id;
        $perPage = min(50, max(5, (int) $request->integer('perPage', 15)));

        $aggSub = DB::table('subscription_invoices as si')
            ->where('si.marketer_id', $marketerId)
            ->where('si.status', 'paid')
            ->whereNotNull('si.paid_at')
            ->whereNotNull('si.tenant_id')
            ->where(function ($q): void {
                $q->whereNull('si.plan')->orWhere('si.plan', 'not like', '%_room_addon%');
            })
            ->groupBy('si.tenant_id')
            ->selectRaw(
                'si.tenant_id, MIN(si.paid_at) as first_paid_at, MAX(si.paid_at) as last_paid_at, COUNT(*) as qualifying_invoice_count, COUNT(DISTINCT si.resort_id) as resort_count, SUM(si.amount) as total_subscription_php'
            );

        $paginator = DB::query()
            ->fromSub($aggSub, 'agg')
            ->join('tenants as t', 't.id', '=', 'agg.tenant_id')
            ->orderByDesc('agg.last_paid_at')
            ->selectRaw('agg.*, t.name as tenant_name, t.slug as tenant_slug')
            ->paginate($perPage);

        $tenantIds = $paginator->getCollection()->pluck('tenant_id')->map(static fn ($id): int => (int) $id)->all();
        $owners = User::query()
            ->whereIn('tenant_id', $tenantIds)
            ->where('role', 'resort_owner')
            ->orderBy('id')
            ->get()
            ->unique('tenant_id')
            ->keyBy('tenant_id');

        $paginator->getCollection()->transform(function ($row) use ($owners): array {
            /** @var \stdClass $row */
            $owner = $owners->get((int) $row->tenant_id);

            return [
                'tenant_id' => (int) $row->tenant_id,
                'tenant_name' => (string) $row->tenant_name,
                'tenant_slug' => (string) $row->tenant_slug,
                'owner_name' => $owner?->name,
                'owner_email' => $owner?->email,
                'first_qualifying_paid_at' => $row->first_paid_at !== null
                    ? Carbon::parse((string) $row->first_paid_at)->toIso8601String()
                    : null,
                'last_qualifying_paid_at' => $row->last_paid_at !== null
                    ? Carbon::parse((string) $row->last_paid_at)->toIso8601String()
                    : null,
                'qualifying_subscription_invoices' => (int) $row->qualifying_invoice_count,
                'referred_resorts_count' => (int) $row->resort_count,
                'total_subscription_volume_php' => round((float) $row->total_subscription_php, 2),
            ];
        });

        $paginator->appends($request->query());

        return $this->successResponse(
            [
                'clients' => $paginator->items(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
                'tier_policy' => $this->marketerTiers->tierPolicySummary(),
            ],
            'Marketing clients',
        );
    }

    /**
     * Guest registration share links must use the real public site, not a stale dev default.
     * When FRONTEND_URL still points at localhost but the dashboard is opened in production,
     * prefer the browser Origin header (same session).
     */
    private function publicRegistrationBaseUrl(Request $request): string
    {
        $configured = rtrim((string) config('app.frontend_url', 'http://127.0.0.1:3000'), '/');
        $origin = $request->headers->get('Origin');
        if (! is_string($origin) || $origin === '') {
            return $configured;
        }

        $origin = rtrim($origin, '/');
        if (! str_starts_with($origin, 'http://') && ! str_starts_with($origin, 'https://')) {
            return $configured;
        }

        $configuredHost = parse_url($configured, PHP_URL_HOST);
        $originHost = parse_url($origin, PHP_URL_HOST);
        if (! is_string($originHost) || $originHost === '') {
            return $configured;
        }

        $localHosts = ['localhost', '127.0.0.1', '[::1]'];
        $configuredIsLocal = in_array($configuredHost, $localHosts, true);
        $originIsLocal = in_array($originHost, $localHosts, true);

        if ($configuredIsLocal && ! $originIsLocal) {
            return $origin;
        }

        if (is_string($configuredHost) && strcasecmp($originHost, $configuredHost) === 0) {
            return $origin;
        }

        return $configured;
    }

    public function assignedResorts(Request $request)
    {
        $marketerId = $request->user()->id;

        $resorts = DB::table('marketer_resorts')
            ->where('marketer_resorts.marketer_id', $marketerId)
            ->join('resorts', 'resorts.id', '=', 'marketer_resorts.resort_id')
            ->select(
                'resorts.id',
                'resorts.name',
                'resorts.address_label',
                'resorts.address_province_psgc',
                'resorts.address_city_municipality_psgc',
                'resorts.address_barangay_psgc',
                'resorts.address_barangay_name',
                'resorts.is_publicly_listed',
                'resorts.is_vip',
            )
            ->get()
            ->map(function ($row): array {
                $display = app(PhilippineLocationService::class)->formatAddressLine(
                    $row->address_province_psgc,
                    $row->address_city_municipality_psgc,
                    $row->address_barangay_name ?? null,
                    $row->address_barangay_psgc,
                ) ?? (filled($row->address_label) ? (string) $row->address_label : null);

                return [
                    'id' => $row->id,
                    'name' => $row->name,
                    'address' => $display,
                    'is_publicly_listed' => (bool) $row->is_publicly_listed,
                    'is_vip' => (bool) $row->is_vip,
                ];
            });

        return $this->successResponse($resorts, 'Assigned resorts fetched');
    }

    public function commissions(Request $request)
    {
        $marketerId = $request->user()->id;
        $perPage = (int) $request->integer('perPage', 12);

        $commissions = Commission::with(['resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc,address_barangay_name', 'releases'])
            ->where('marketer_id', $marketerId)
            ->latest()
            ->paginate($perPage);

        return $this->successResponse($commissions, 'Commissions fetched');
    }

    public function releaseHistory(Request $request)
    {
        $marketerId = $request->user()->id;
        $perPage = (int) $request->integer('perPage', 12);

        $releases = CommissionRelease::with(['commission.resort:id,name', 'releasedByUser:id,name'])
            ->whereHas('commission', fn ($q) => $q->where('marketer_id', $marketerId))
            ->latest('released_at')
            ->paginate($perPage);

        return $this->successResponse($releases, 'Release history fetched');
    }

    /** Year-scoped analytics for the authenticated marketer only. */
    public function analytics(Request $request)
    {
        if ($request->user()->role !== 'marketing') {
            return $this->errorResponse('Marketing analytics is only available for marketing accounts.', null, 403);
        }

        $year = (int) $request->integer('year', now()->year);
        $year = min(max($year, 2020), now()->year + 1);

        $marketerId = $request->user()->id;
        $periodStart = sprintf('%04d-01', $year);
        $periodEnd = sprintf('%04d-12', $year);

        $monthBuckets = [];
        for ($m = 1; $m <= 12; $m++) {
            $p = sprintf('%04d-%02d', $year, $m);
            $monthBuckets[$p] = [
                'period' => $p,
                'commission_pending' => 0.0,
                'commission_released' => 0.0,
                'referral_payment_count' => 0,
                'referral_payment_volume' => 0.0,
            ];
        }

        $commissionsYtd = Commission::query()
            ->where('marketer_id', $marketerId)
            ->whereBetween('period', [$periodStart, $periodEnd])
            ->with(['resort:id,name'])
            ->get();

        foreach ($commissionsYtd as $row) {
            if (! isset($monthBuckets[$row->period])) {
                continue;
            }
            $amt = (float) $row->commission_amount;
            if ($row->status === 'released') {
                $monthBuckets[$row->period]['commission_released'] += $amt;
            } else {
                $monthBuckets[$row->period]['commission_pending'] += $amt;
            }
        }

        $referralInvoices = SubscriptionInvoice::withoutGlobalScopes()
            ->where('marketer_id', $marketerId)
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereYear('paid_at', $year)
            ->get(['paid_at', 'amount']);

        foreach ($referralInvoices as $inv) {
            $p = $inv->paid_at->format('Y-m');
            if (! isset($monthBuckets[$p])) {
                continue;
            }
            $monthBuckets[$p]['referral_payment_count']++;
            $monthBuckets[$p]['referral_payment_volume'] += (float) $inv->amount;
        }

        $byResort = $commissionsYtd->groupBy('resort_id')->map(function ($group) {
            $first = $group->first();

            return [
                'resort_id' => (int) $first->resort_id,
                'resort_name' => $first->resort?->name ?? 'Resort',
                'commission_total' => round((float) $group->sum('commission_amount'), 2),
                'commission_pending' => round((float) $group->where('status', 'pending')->sum('commission_amount'), 2),
                'commission_released' => round((float) $group->where('status', 'released')->sum('commission_amount'), 2),
            ];
        })->values()->all();

        $totals = [
            'commission_pending_ytd' => round((float) $commissionsYtd->where('status', 'pending')->sum('commission_amount'), 2),
            'commission_released_ytd' => round((float) $commissionsYtd->where('status', 'released')->sum('commission_amount'), 2),
            'referral_subscription_count_ytd' => $referralInvoices->count(),
            'referral_subscription_volume_ytd' => round((float) $referralInvoices->sum('amount'), 2),
        ];

        return $this->successResponse([
            'year' => $year,
            'monthly' => array_values($monthBuckets),
            'by_resort' => $byResort,
            'totals' => $totals,
        ], 'Marketing analytics');
    }
}
