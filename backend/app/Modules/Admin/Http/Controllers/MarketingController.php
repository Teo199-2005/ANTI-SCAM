<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\MarketerPayoutBatch;
use App\Models\SubscriptionInvoice;
use App\Models\User;
use App\Modules\Audit\Services\AuditLogService;
use App\Services\MarketerCommissionPayoutService;
use App\Services\MarketerTierService;
use App\Shared\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketingController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly AuditLogService $audits,
        private readonly MarketerTierService $marketerTiers,
        private readonly MarketerCommissionPayoutService $marketerPayouts,
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

        $marketerQuery = User::query()->where('role', 'marketing');
        if ($search !== '') {
            $like = '%'.$search.'%';
            $marketerQuery->where(function ($q) use ($like): void {
                $q->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('referral_code', 'like', $like);
            });
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

        $now = Carbon::now();

        $rows = [];
        foreach ($marketers as $m) {
            $ref = $referralStats->get($m->id);
            $resortRef = $resortReferralStats->get($m->id);
            $act = $activityStats->get($m->id);
            $com = $commissionStats->get($m->id);

            $referredClientsCount = $ref ? (int) $ref->referred_clients_count : 0;
            $referredResortsCount = $resortRef ? (int) $resortRef->referred_resorts_count : 0;
            $tierResolved = $this->marketerTiers->resolveTier($referredClientsCount);
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
                'marketer_tier_key' => $tierResolved['tier_key'] ?? null,
                'marketer_tier_label' => $tierResolved['label'] ?? null,
                'per_payment_php' => $tierResolved['per_payment_php'] ?? null,
                'next_tier_at' => $tierResolved['next_tier_at'] ?? null,
                'clients_to_next_tier' => $tierResolved['clients_to_next_tier'] ?? null,
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
                'new_client_definition' => 'Converting client = distinct resort-owner organization (tenant) with at least one paid qualifying subscription invoice attributed to the marketer. Multiple resorts or renewals under the same tenant still count as one client for tiers. Distinct resorts with referral payments is shown separately.',
                'tier_ladder' => $this->marketerTiers->tierLadder(),
                'tier_policy' => $this->marketerTiers->tierPolicySummary(),
            ],
        ], 'Marketing monitoring snapshot');
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
