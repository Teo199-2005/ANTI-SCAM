<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\MarketerBookingCommissionEvent;
use App\Models\MarketerPayoutBatch;
use App\Models\SubscriptionInvoice;
use App\Models\User;
use App\Modules\Audit\Services\AuditLogService;
use App\Services\MarketerBookingCommissionStatsService;
use App\Services\MarketerCommissionPayoutService;
use App\Services\AdminBookingCommissionAnalyticsService;
use App\Services\MarketerReferralDetailService;
use App\Services\MarketingBookingCommissionSettingsService;
use App\Support\MarketerAdminProfilePresenter;
use App\Support\ResortLocationQuery;
use App\Shared\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketingController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly AuditLogService $audits,
        private readonly MarketerBookingCommissionStatsService $bookingStats,
        private readonly MarketingBookingCommissionSettingsService $bookingSettings,
        private readonly AdminBookingCommissionAnalyticsService $bookingAnalytics,
        private readonly MarketerCommissionPayoutService $marketerPayouts,
        private readonly MarketerReferralDetailService $marketerReferralDetail,
    ) {}

    /** List all marketers with their assigned resort count. */
    public function marketers()
    {
        $marketers = User::where('role', 'marketing')
            ->withCount('assignedResorts')
            ->latest()
            ->paginate(20);

        return $this->successResponse($marketers, 'Marketers fetched');
    }

    /**
     * Admin: per-marketer funnel + commission snapshot.
     * "New client" = distinct resort with a paid subscription invoice (excludes room-addon-only lines) attributed to the marketer.
     */
    public function marketersMonitoring(Request $request)
    {
        $search = $request->string('search')->trim()->toString();

        $location = ResortLocationQuery::fromRequest($request);

        $marketerQuery = User::query()->where('role', 'marketing');
        if ($search !== '') {
            $like = '%'.$search.'%';
            $marketerQuery->where(function ($q) use ($like): void {
                $q->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('referral_code', 'like', $like);
            });
        }

        if ($location['province_psgc'] !== null || $location['city_municipality_psgc'] !== null) {
            ResortLocationQuery::applyToUserMailingColumns(
                $marketerQuery,
                $location['province_psgc'],
                $location['city_municipality_psgc'],
            );
        }

        $marketers = $marketerQuery->withCount('assignedResorts')->orderBy('name')->get();

        $clientConversionSub = DB::table('subscription_invoices')
            ->select('marketer_id', 'tenant_id', DB::raw('MIN(paid_at) as first_paid'))
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereNotNull('marketer_id')
            ->whereNotNull('tenant_id')
            ->where(function ($q): void {
                $q->whereNull('plan')->orWhere('plan', 'not like', '%_room_addon%');
            })
            ->groupBy('marketer_id', 'tenant_id');

        $referralStats = DB::query()
            ->fromSub($clientConversionSub, 'conv')
            ->selectRaw('marketer_id, COUNT(*) as referred_clients_count, MAX(first_paid) as last_new_referred_resort_at')
            ->groupBy('marketer_id')
            ->get()
            ->keyBy('marketer_id');

        $resortConversionSub = DB::table('subscription_invoices')
            ->select('marketer_id', 'resort_id', DB::raw('MIN(paid_at) as first_paid'))
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereNotNull('marketer_id')
            ->whereNotNull('resort_id')
            ->where(function ($q): void {
                $q->whereNull('plan')->orWhere('plan', 'not like', '%_room_addon%');
            })
            ->groupBy('marketer_id', 'resort_id');

        $resortReferralStats = DB::query()
            ->fromSub($resortConversionSub, 'rcv')
            ->selectRaw('marketer_id, COUNT(*) as referred_resorts_count')
            ->groupBy('marketer_id')
            ->get()
            ->keyBy('marketer_id');

        $activityStats = SubscriptionInvoice::query()
            ->selectRaw('marketer_id, MAX(paid_at) as last_any_referral_payment_at, COALESCE(SUM(amount), 0) as total_referred_subscription_php')
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereNotNull('marketer_id')
            ->groupBy('marketer_id')
            ->get()
            ->keyBy('marketer_id');

        $commissionStats = Commission::query()
            ->selectRaw(
                'marketer_id,
                SUM(CASE WHEN status = \'pending\' THEN commission_amount ELSE 0 END) as pending_commission,
                SUM(CASE WHEN status = \'released\' THEN commission_amount ELSE 0 END) as released_commission_gross,
                SUM(commission_amount) as total_commission_gross'
            )
            ->groupBy('marketer_id')
            ->get()
            ->keyBy('marketer_id');

        $bookingGrossByMarketer = MarketerBookingCommissionEvent::query()
            ->where('type', MarketerBookingCommissionEvent::TYPE_CREDIT)
            ->groupBy('marketer_id')
            ->selectRaw('marketer_id, COALESCE(SUM(amount), 0) as gross')
            ->pluck('gross', 'marketer_id');

        $now = Carbon::now();

        $rows = [];
        foreach ($marketers as $m) {
            $ref = $referralStats->get($m->id);
            $resortRef = $resortReferralStats->get($m->id);
            $act = $activityStats->get($m->id);
            $com = $commissionStats->get($m->id);

            $referredClientsCount = $ref ? (int) $ref->referred_clients_count : 0;
            $referredResortsCount = $resortRef ? (int) $resortRef->referred_resorts_count : 0;
            $bookingCredits = $this->bookingStats->qualifyingBookingsCount((int) $m->id);
            $bookingReversals = $this->bookingStats->reversedBookingsCount((int) $m->id);
            $lastNewRaw = $ref?->last_new_referred_resort_at ?? null;
            $lastNewAt = $lastNewRaw ? Carbon::parse($lastNewRaw) : null;

            $monthsSinceNew = null;
            if ($lastNewAt !== null) {
                $monthsSinceNew = max(0, (int) $lastNewAt->diffInMonths($now));
            }

            // Sort: longest idle first; never converted (no referred resort yet) sorts to top as highest attention.
            $sortIdle = $monthsSinceNew !== null ? $monthsSinceNew : 10_000;

            $rows[] = [
                'id' => $m->id,
                'name' => $m->name,
                'email' => $m->email,
                'avatar_url' => $m->avatar_url,
                'referral_code' => $m->referral_code,
                'joined_at' => $m->created_at?->toIso8601String(),
                'assigned_resorts_count' => (int) $m->assigned_resorts_count,
                'referred_clients_count' => $referredClientsCount,
                'referred_resorts_count' => $referredResortsCount,
                'last_new_referred_resort_at' => $lastNewAt?->toIso8601String(),
                'months_since_last_new_referred_resort' => $monthsSinceNew,
                'last_any_referral_payment_at' => isset($act->last_any_referral_payment_at)
                    ? Carbon::parse($act->last_any_referral_payment_at)->toIso8601String()
                    : null,
                'total_referred_subscription_php' => $act ? round((float) $act->total_referred_subscription_php, 2) : 0.0,
                'commission_pending_php' => $com ? round((float) $com->pending_commission, 2) : 0.0,
                'commission_released_gross_php' => $com ? round((float) $com->released_commission_gross, 2) : 0.0,
                'commission_total_gross_php' => $com ? round((float) $com->total_commission_gross, 2) : 0.0,
                'booking_credits_count' => $bookingCredits,
                'booking_reversals_count' => $bookingReversals,
                'booking_credits_gross_php' => round((float) ($bookingGrossByMarketer->get($m->id) ?? 0), 2),
                'current_commission_per_booking_php' => $this->bookingSettings->amountPhpForNewCredits(),
                '_sort_idle' => $sortIdle,
            ];
        }

        usort($rows, function (array $a, array $b): int {
            return $b['_sort_idle'] <=> $a['_sort_idle'];
        });

        foreach ($rows as &$r) {
            unset($r['_sort_idle']);
        }
        unset($r);

        return $this->successResponse([
            'rows' => $rows,
            'meta' => [
                'generated_at' => $now->toIso8601String(),
                'new_client_definition' => 'Signup funnel: distinct resort-owner organizations with referral attribution (paid subscription or trial). Booking commissions: paid online guest bookings at assigned resorts (flat rate per credit).',
                'booking_commission_policy' => $this->bookingStats->bookingCommissionPolicySummary(),
                'commission_per_booking_php' => $this->bookingSettings->amountPhpForNewCredits(),
                'commissions_enabled' => $this->bookingSettings->isEnabled(),
                'settings_policy_note' => $this->bookingSettings->policyNote(),
            ],
        ], 'Marketing monitoring snapshot');
    }

    /** Admin analytics for booking commissions (amounts from frozen event rows). */
    public function bookingCommissionAnalytics(Request $request)
    {
        $year = $request->integer('year');
        $year = $year > 2000 && $year < 2100 ? $year : (int) Carbon::now()->year;

        return $this->successResponse(
            $this->bookingAnalytics->report($year),
            'Booking commission analytics',
        );
    }

    /** Admin: clients and subscription transactions for one marketing partner. */
    public function marketerDetail(User $marketer)
    {
        if ($marketer->role !== 'marketing') {
            return $this->errorResponse('User is not a marketing partner.', null, 404);
        }

        $marketerId = (int) $marketer->id;

        $commissionStats = Commission::query()
            ->selectRaw(
                'SUM(CASE WHEN status = \'pending\' THEN commission_amount ELSE 0 END) as pending_commission,
                SUM(CASE WHEN status = \'released\' THEN commission_amount ELSE 0 END) as released_commission_gross,
                SUM(commission_amount) as total_commission_gross'
            )
            ->where('marketer_id', $marketerId)
            ->first();

        $clients = $this->marketerReferralDetail->clientsForMarketer($marketerId);
        $transactions = $this->marketerReferralDetail->subscriptionTransactionsForMarketer($marketerId);
        $bookingCommissions = $this->marketerReferralDetail->bookingCommissionsForMarketer($marketerId);

        $paidClients = 0;
        $trialClients = 0;
        foreach ($clients as $c) {
            if (($c['source'] ?? '') === 'paid_subscription') {
                $paidClients++;
            } elseif (($c['source'] ?? '') === 'signup_trial') {
                $trialClients++;
            }
        }

        $referralClientsCount = $paidClients + $trialClients;

        return $this->successResponse([
            'marketer' => [
                'id' => $marketer->id,
                'name' => $marketer->name,
                'email' => $marketer->email,
                'referral_code' => $marketer->referral_code,
                'joined_at' => $marketer->created_at?->toIso8601String(),
                'profile' => MarketerAdminProfilePresenter::toArray($marketer),
                'assigned_resorts_count' => (int) DB::table('marketer_resorts')->where('marketer_id', $marketerId)->count(),
                'referral_signup_clients_count' => $referralClientsCount,
                'qualifying_bookings_count' => $this->bookingStats->qualifyingBookingsCount($marketerId),
                'booking_reversals_count' => $this->bookingStats->reversedBookingsCount($marketerId),
                'booking_credits_gross_php' => round((float) MarketerBookingCommissionEvent::query()
                    ->where('marketer_id', $marketerId)
                    ->where('type', MarketerBookingCommissionEvent::TYPE_CREDIT)
                    ->sum('amount'), 2),
                'current_commission_per_booking_php' => $this->bookingSettings->amountPhpForNewCredits(),
                'commission_pending_php' => $commissionStats ? round((float) $commissionStats->pending_commission, 2) : 0.0,
                'commission_released_gross_php' => $commissionStats ? round((float) $commissionStats->released_commission_gross, 2) : 0.0,
                'commission_total_gross_php' => $commissionStats ? round((float) $commissionStats->total_commission_gross, 2) : 0.0,
            ],
            'clients' => $clients,
            'clients_meta' => [
                'total' => count($clients),
                'paid_converting' => $paidClients,
                'signup_trial' => $trialClients,
            ],
            'transactions' => $transactions,
            'transactions_meta' => [
                'total' => count($transactions),
                'definition' => 'Legacy subscription invoices attributed to this marketer (paid and pending), newest first. New earnings are booking commissions.',
            ],
            'booking_commissions' => $bookingCommissions,
            'booking_commissions_meta' => [
                'total' => count($bookingCommissions),
                'definition' => 'Credits and reversals for paid online guest bookings at assigned resorts.',
            ],
        ], 'Marketing partner detail');
    }

    /** Assign a resort to a marketer. */
    public function assign(Request $request)
    {
        $data = $request->validate([
            'marketer_id' => ['required', 'exists:users,id'],
            'resort_id' => ['required', 'exists:resorts,id'],
        ]);

        DB::table('marketer_resorts')->updateOrInsert(
            ['marketer_id' => $data['marketer_id'], 'resort_id' => $data['resort_id']],
            ['created_at' => now(), 'updated_at' => now()]
        );

        return $this->successResponse(null, 'Resort assigned to marketer');
    }

    /** Unassign a resort from a marketer. */
    public function unassign(Request $request)
    {
        $data = $request->validate([
            'marketer_id' => ['required', 'integer'],
            'resort_id' => ['required', 'integer'],
        ]);

        DB::table('marketer_resorts')
            ->where('marketer_id', $data['marketer_id'])
            ->where('resort_id', $data['resort_id'])
            ->delete();

        return $this->successResponse(null, 'Resort unassigned from marketer');
    }

    /** Release a commission manually. */
    public function release(Request $request, Commission $commission)
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        if ($commission->status === 'released') {
            return $this->errorResponse('Commission already released.', null, 422);
        }

        if ($commission->payout_batch_id !== null) {
            $batch = MarketerPayoutBatch::query()->find($commission->payout_batch_id);
            if ($batch && in_array($batch->status, [
                MarketerPayoutBatch::STATUS_PENDING_SUBMIT,
                MarketerPayoutBatch::STATUS_SUBMITTED,
            ], true)) {
                return $this->errorResponse(
                    'This commission is locked for an automated GCash payout. Wait for Xendit to finish or fail before releasing manually.',
                    null,
                    422
                );
            }
        }

        DB::transaction(function () use ($commission, $data): void {
            $gross = round((float) $commission->commission_amount, 2);
            $rate = $this->marketerPayouts->withholdingRate();
            $net = round($gross * $this->marketerPayouts->netPayoutFactor(), 2);
            $userNote = isset($data['notes']) ? trim((string) $data['notes']) : '';
            $systemNote = sprintf(
                'Manual release: net ₱%s (gross ₱%s, %s%% platform withholding — same basis as GCash batches).',
                number_format($net, 2, '.', ''),
                number_format($gross, 2, '.', ''),
                number_format($rate * 100, 2, '.', ''),
            );
            $notes = $userNote === '' ? $systemNote : $userNote.' | '.$systemNote;

            CommissionRelease::create([
                'commission_id' => $commission->id,
                'released_by' => auth()->id(),
                'amount' => $net,
                'notes' => $notes,
                'released_at' => now(),
                'release_source' => CommissionRelease::SOURCE_MANUAL,
                'payout_batch_id' => null,
            ]);

            $commission->update(['status' => 'released']);

            $this->audits->log('commission_released', 'commission', $commission->id, ['status' => 'pending'], ['status' => 'released', 'amount_net' => $net, 'amount_gross' => $gross]);
        });

        return $this->successResponse(null, 'Commission released');
    }
}
