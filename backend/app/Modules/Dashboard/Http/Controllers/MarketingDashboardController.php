<?php

namespace App\Modules\Dashboard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\ReferralSignupAttribution;
use App\Models\Resort;
use App\Models\MarketerBookingCommissionEvent;
use App\Models\User;
use App\Support\ResortLocationQuery;
use App\Services\LegacySubscriptionCommissionCleanupService;
use App\Services\MarketerBookingCommissionStatsService;
use App\Modules\Billing\Services\PhilippinesPayoutBankChannelService;
use App\Services\MarketerCommissionPayoutService;
use App\Services\ReferralSignupTrialService;
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
        private readonly MarketerBookingCommissionStatsService $bookingStats,
        private readonly ReferralSignupTrialService $referralSignupTrial,
        private readonly LegacySubscriptionCommissionCleanupService $commissionScope,
        private readonly PhilippinesPayoutBankChannelService $payoutBanks,
    ) {}

    public function payoutBanks(Request $request)
    {
        if ($request->user()->role !== 'marketing') {
            return $this->errorResponse('Forbidden', null, 403);
        }

        return $this->successResponse([
            'banks' => $this->payoutBanks->listBanks(),
        ], 'Payout banks');
    }

    public function stats(Request $request)
    {
        $marketerId = $request->user()->id;

        $this->commissionScope->voidPendingLegacyRows($marketerId);

        $totalCommissions = $this->commissionScope->sumTotalBookingGross($marketerId);
        $pendingCommissions = $this->commissionScope->sumPendingBookingGross($marketerId);
        $pendingRows = $this->commissionScope->pendingBookingRows($marketerId);
        $pendingPayoutNetEstimate = $pendingRows->isEmpty()
            ? 0.0
            : (float) $this->marketerPayouts->allocateNetByCommission($pendingRows)['net_total'];

        $bookingTier = $this->commissionScope->bookingTierKey();
        $releasedCommissionsPaidOut = (float) CommissionRelease::query()
            ->whereHas('commission', fn ($q) => $q
                ->where('marketer_id', $marketerId)
                ->where('marketer_tier', $bookingTier))
            ->sum('amount');
        $releasedCommissionsGross = $this->commissionScope->sumReleasedBookingGross($marketerId);

        $resortCount = DB::table('marketer_resorts')->where('marketer_id', $marketerId)->count();

        $currentPeriod = $this->bookingStats->currentMonthPeriod();
        $qualifyingBookingsLifetime = $this->bookingStats->qualifyingBookingsCount($marketerId);
        $qualifyingBookingsMtd = $this->bookingStats->qualifyingBookingsCount($marketerId, $currentPeriod, $currentPeriod);
        $reversedBookingsMtd = $this->bookingStats->reversedBookingsCount($marketerId, $currentPeriod, $currentPeriod);
        $commissionPerBooking = $this->bookingStats->commissionPerBookingPhp($marketerId);
        $bookingPolicy = $this->bookingStats->bookingCommissionPolicySummary();

        $user = $request->user();
        $frontend = $this->publicRegistrationBaseUrl($request);
        $code = $user->referral_code;
        $shareRegister = $code !== null && $code !== ''
            ? "{$frontend}/register?intent=owner&ref=".rawurlencode((string) $code)
            : null;
        $referralSignupClientsCount = $this->referralSignupTrial->countSignupClients($marketerId);
        $referralHint = $code !== null && $code !== ''
            ? "Share your registration link — resort owners who sign up with code {$code} are attributed to you. You earn ₱{$commissionPerBooking} per paid online guest booking at resorts assigned to you (not on subscription payments)."
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
            'referralSignupClientsCount' => $referralSignupClientsCount,
            'qualifyingBookingsCount' => $qualifyingBookingsLifetime,
            'qualifyingBookingsMtd' => $qualifyingBookingsMtd,
            'reversedBookingsMtd' => $reversedBookingsMtd,
            'commissionPerBookingPhp' => $commissionPerBooking,
            'bookingCommissionPolicy' => $bookingPolicy,
            'referral_code' => $code,
            'referral_share_register_url' => $shareRegister,
            'referral_subscribe_hint' => $referralHint,
            'commission_payout_schedule' => 'Pending booking commissions are paid automatically to your bank account (Xendit) on the 10th of each month (Asia/Manila), for earnings through the previous calendar month, when automation is enabled and payout details are complete. A platform withholding (taxes and fees) is deducted before each disbursement; see payoutWithholdingRate.',
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
        $page = max(1, (int) $request->integer('page', 1));

        $paidTenantIds = DB::table('subscription_invoices as si')
            ->where('si.marketer_id', $marketerId)
            ->where('si.status', 'paid')
            ->whereNotNull('si.paid_at')
            ->whereNotNull('si.tenant_id')
            ->where(function ($q): void {
                $q->whereNull('si.plan')->orWhere('si.plan', 'not like', '%_room_addon%');
            })
            ->distinct()
            ->pluck('si.tenant_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $clients = [];

        $aggRows = DB::table('subscription_invoices as si')
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
            )
            ->get();

        $tenantIds = $aggRows->pluck('tenant_id')->map(static fn ($id): int => (int) $id)->all();
        $tenants = DB::table('tenants')->whereIn('id', $tenantIds)->get()->keyBy('id');
        $owners = User::query()
            ->whereIn('tenant_id', $tenantIds)
            ->where('role', 'resort_owner')
            ->orderBy('id')
            ->get()
            ->unique('tenant_id')
            ->keyBy('tenant_id');

        foreach ($aggRows as $row) {
            $tenantId = (int) $row->tenant_id;
            $tenant = $tenants->get($tenantId);
            $owner = $owners->get($tenantId);
            $lastAt = Carbon::parse((string) $row->last_paid_at);

            $clients[] = [
                'source' => 'paid_subscription',
                'sort_at' => $lastAt->timestamp,
                'tenant_id' => $tenantId,
                'tenant_name' => (string) ($tenant->name ?? 'Resort owner'),
                'tenant_slug' => (string) ($tenant->slug ?? ''),
                'owner_name' => $owner?->name,
                'owner_email' => $owner?->email,
                'first_qualifying_paid_at' => Carbon::parse((string) $row->first_paid_at)->toIso8601String(),
                'last_qualifying_paid_at' => $lastAt->toIso8601String(),
                'qualifying_subscription_invoices' => (int) $row->qualifying_invoice_count,
                'referred_resorts_count' => (int) $row->resort_count,
                'total_subscription_volume_php' => round((float) $row->total_subscription_php, 2),
                'trial_ends_at' => null,
                'referral_code' => null,
                'trial_active' => false,
                'referred_user_id' => null,
            ];
        }

        $signupRows = ReferralSignupAttribution::query()
            ->where('marketer_id', $marketerId)
            ->with(['referredUser', 'tenant'])
            ->orderByDesc('trial_starts_at')
            ->get();

        foreach ($signupRows as $signup) {
            if ($signup->tenant_id !== null && in_array((int) $signup->tenant_id, $paidTenantIds, true)) {
                continue;
            }

            $owner = $signup->referredUser;
            $clients[] = [
                'source' => 'signup_referral',
                'sort_at' => $signup->trial_starts_at->timestamp,
                'tenant_id' => $signup->tenant_id,
                'tenant_name' => $signup->tenant?->name ?? ($owner?->name ?? 'Resort owner'),
                'tenant_slug' => $signup->tenant?->slug ?? '',
                'owner_name' => $owner?->name,
                'owner_email' => $owner?->email,
                'first_qualifying_paid_at' => null,
                'last_qualifying_paid_at' => null,
                'qualifying_subscription_invoices' => 0,
                'referred_resorts_count' => $signup->tenant_id !== null ? 1 : 0,
                'total_subscription_volume_php' => 0.0,
                'trial_ends_at' => null,
                'referral_code' => $signup->referral_code,
                'trial_active' => false,
                'referred_user_id' => $signup->referred_user_id,
                'referred_at' => $signup->trial_starts_at->toIso8601String(),
            ];
        }

        $paidTotal = 0;
        $signupReferralTotal = 0;
        foreach ($clients as $clientRow) {
            $source = (string) ($clientRow['source'] ?? '');
            if ($source === 'paid_subscription') {
                $paidTotal++;
            } elseif ($source === 'signup_referral' || $source === 'signup_trial') {
                $signupReferralTotal++;
            }
        }

        $location = ResortLocationQuery::fromRequest($request);
        if ($location['province_psgc'] !== null || $location['city_municipality_psgc'] !== null) {
            $clients = $this->filterMarketingClientsByResortLocation(
                $clients,
                $location['province_psgc'],
                $location['city_municipality_psgc'],
            );
        }

        usort($clients, static fn (array $a, array $b): int => $b['sort_at'] <=> $a['sort_at']);
        $total = count($clients);
        $offset = ($page - 1) * $perPage;
        $slice = array_slice($clients, $offset, $perPage);
        foreach ($slice as &$row) {
            unset($row['sort_at']);
        }
        unset($row);

        $lastPage = max(1, (int) ceil($total / $perPage));

        return $this->successResponse(
            [
                'clients' => $slice,
                'meta' => [
                    'current_page' => $page,
                    'last_page' => $lastPage,
                    'per_page' => $perPage,
                    'total' => $total,
                    'paid_total' => $paidTotal,
                    'signup_referral_total' => $signupReferralTotal,
                    'trial_total' => $signupReferralTotal,
                    'trial_active_total' => 0,
                ],
                'booking_commission_policy' => $this->bookingStats->bookingCommissionPolicySummary(),
            ],
            'Marketing clients',
        );
    }

    public function bookings(Request $request)
    {
        $marketerId = $request->user()->id;
        $perPage = min(50, max(5, (int) $request->integer('perPage', 15)));

        $events = MarketerBookingCommissionEvent::query()
            ->with(['resort:id,name', 'reservation:id,reference_no,check_in_date,check_out_date,status'])
            ->where('marketer_id', $marketerId)
            ->latest('id')
            ->paginate($perPage);

        return $this->successResponse($events, 'Booking commission events fetched');
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

        $commissions = $this->commissionScope->bookingCommissionsForMarketer($marketerId)
            ->with(['resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc,address_barangay_name', 'releases'])
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
                'booking_credits_count' => 0,
                'booking_reversals_count' => 0,
            ];
        }

        $commissionsYtd = $this->commissionScope->bookingCommissionsForMarketer($marketerId)
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

        $bookingCreditsByPeriod = $this->bookingStats->bookingCreditsByPeriod($marketerId, $periodStart, $periodEnd);
        foreach ($bookingCreditsByPeriod as $p => $count) {
            if (isset($monthBuckets[$p])) {
                $monthBuckets[$p]['booking_credits_count'] = $count;
            }
        }

        $reversalsByPeriod = MarketerBookingCommissionEvent::query()
            ->select('period', DB::raw('COUNT(*) as c'))
            ->where('marketer_id', $marketerId)
            ->where('type', MarketerBookingCommissionEvent::TYPE_REVERSAL)
            ->whereBetween('period', [$periodStart, $periodEnd])
            ->groupBy('period')
            ->pluck('c', 'period');

        foreach ($reversalsByPeriod as $p => $count) {
            if (isset($monthBuckets[$p])) {
                $monthBuckets[$p]['booking_reversals_count'] = (int) $count;
            }
        }

        $byResort = $commissionsYtd->groupBy('resort_id')->map(function ($group) {
            $first = $group->first();

            return [
                'resort_id' => (int) $first->resort_id,
                'resort_name' => $first->resort?->name ?? 'Resort',
                'booking_count' => (int) $group->sum('booking_count'),
                'commission_total' => round((float) $group->sum('commission_amount'), 2),
                'commission_pending' => round((float) $group->where('status', 'pending')->sum('commission_amount'), 2),
                'commission_released' => round((float) $group->where('status', 'released')->sum('commission_amount'), 2),
            ];
        })->values()->all();

        $bookingCreditsYtd = $this->bookingStats->qualifyingBookingsCount($marketerId, $periodStart, $periodEnd);

        $totals = [
            'commission_pending_ytd' => round((float) $commissionsYtd->where('status', 'pending')->sum('commission_amount'), 2),
            'commission_released_ytd' => round((float) $commissionsYtd->where('status', 'released')->sum('commission_amount'), 2),
            'booking_credits_ytd' => $bookingCreditsYtd,
            'booking_reversals_ytd' => $this->bookingStats->reversedBookingsCount($marketerId, $periodStart, $periodEnd),
        ];

        return $this->successResponse([
            'year' => $year,
            'monthly' => array_values($monthBuckets),
            'by_resort' => $byResort,
            'totals' => $totals,
        ], 'Marketing analytics');
    }

    /**
     * @param  list<array<string, mixed>>  $clients
     * @return list<array<string, mixed>>
     */
    private function filterMarketingClientsByResortLocation(array $clients, ?string $provincePsgc, ?string $cityPsgc): array
    {
        $tenantIds = collect($clients)
            ->pluck('tenant_id')
            ->filter()
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        $matchingTenants = [];
        if ($tenantIds !== []) {
            $q = Resort::withoutGlobalScopes()->whereIn('tenant_id', $tenantIds);
            ResortLocationQuery::applyToResortColumns($q, $provincePsgc, $cityPsgc);
            $matchingTenants = $q->distinct()->pluck('tenant_id')->map(static fn ($id): int => (int) $id)->all();
        }

        $matchingUserIds = [];
        if ($provincePsgc !== null || $cityPsgc !== null) {
            $userQ = User::query()->where('role', 'resort_owner')->whereIn('id', collect($clients)->pluck('referred_user_id')->filter());
            ResortLocationQuery::whereUserTenantHasResortLocation($userQ, $provincePsgc, $cityPsgc);
            $matchingUserIds = $userQ->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        }

        return array_values(array_filter($clients, function (array $row) use ($matchingTenants, $matchingUserIds): bool {
            $tenantId = $row['tenant_id'] ?? null;
            if ($tenantId !== null && in_array((int) $tenantId, $matchingTenants, true)) {
                return true;
            }

            $userId = $row['referred_user_id'] ?? null;

            return $userId !== null && in_array((int) $userId, $matchingUserIds, true);
        }));
    }
}
