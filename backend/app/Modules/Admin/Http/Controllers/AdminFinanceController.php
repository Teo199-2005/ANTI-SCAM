<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\MarketerPayoutBatch;
use App\Models\Reservation;
use App\Models\SubscriptionInvoice;
use App\Services\AdminBookingCommissionAnalyticsService;
use App\Services\LegacySubscriptionCommissionCleanupService;
use App\Services\MarketerCommissionPayoutService;
use App\Services\MarketingBookingCommissionSettingsService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminFinanceController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly MarketerCommissionPayoutService $payoutService,
        private readonly AdminBookingCommissionAnalyticsService $bookingAnalytics,
        private readonly MarketingBookingCommissionSettingsService $bookingSettings,
        private readonly LegacySubscriptionCommissionCleanupService $commissionScope,
    ) {}

    /** Platform-wide money snapshot for admin monitoring. */
    public function overview(Request $request)
    {
        $whRate = $this->payoutService->withholdingRate();
        $whPct = round($whRate * 100, 2);

        $subPaid = (float) SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', 'paid')
            ->sum('amount');
        $subPending = (float) SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', 'pending')
            ->sum('amount');

        // Only realized stays: paid-then-cancelled must not count as platform booking inflow.
        $bookingPaid = (float) Reservation::withoutGlobalScopes()
            ->where('xendit_payment_status', 'paid')
            ->revenueEligible()
            ->sum('reservation_fee');

        $this->commissionScope->voidPendingLegacyRows();

        $commissionGrossPending = (float) $this->commissionScope->scopeBookingCommissionsOnly(
            Commission::query()->where('status', 'pending')
        )->sum('commission_amount');
        $commissionGrossReleased = (float) $this->commissionScope->scopeBookingCommissionsOnly(
            Commission::query()->where('status', 'released')
        )->sum('commission_amount');

        $commissionNetPaidOut = (float) CommissionRelease::query()->sum('amount');

        $batchAgg = MarketerPayoutBatch::query()
            ->where('status', MarketerPayoutBatch::STATUS_SUCCEEDED)
            ->selectRaw('COALESCE(SUM(total_amount), 0) as net_paid')
            ->first();
        $netFromBatches = (float) ($batchAgg->net_paid ?? 0);

        $grossFromSucceededBatches = (float) DB::table('marketer_payout_batch_items as bi')
            ->join('marketer_payout_batches as b', 'b.id', '=', 'bi.batch_id')
            ->join('commissions as c', 'c.id', '=', 'bi.commission_id')
            ->where('b.status', MarketerPayoutBatch::STATUS_SUCCEEDED)
            ->sum('c.commission_amount');

        $withheldOnSucceededBatches = round(max(0, $grossFromSucceededBatches - $netFromBatches), 2);

        $bookingYear = (int) now()->year;
        $bookingReport = $this->bookingAnalytics->report($bookingYear);

        return $this->successResponse([
            'withholding_rate' => $whRate,
            'withholding_percent_label' => $whPct.'%',
            'subscription_inflows_paid' => round($subPaid, 2),
            'subscription_inflows_pending' => round($subPending, 2),
            'guest_booking_paid_total' => round($bookingPaid, 2),
            'commission_gross_pending' => round($commissionGrossPending, 2),
            'commission_gross_released' => round($commissionGrossReleased, 2),
            'commission_net_paid_to_marketers' => round($commissionNetPaidOut, 2),
            'payout_batches_succeeded_gross' => round($grossFromSucceededBatches, 2),
            'payout_batches_succeeded_net' => round($netFromBatches, 2),
            'withheld_on_succeeded_batches' => $withheldOnSucceededBatches,
            'booking_commissions' => [
                'current_rate_php' => $this->bookingSettings->amountPhpForNewCredits(),
                'enabled' => $this->bookingSettings->isEnabled(),
                'ytd' => $bookingReport['totals'],
                'ledger' => $bookingReport['commission_ledger'],
                'policy_note' => $this->bookingSettings->policyNote(),
            ],
            'counts' => [
                'subscription_invoices_paid' => SubscriptionInvoice::withoutGlobalScopes()->where('status', 'paid')->count(),
                'subscription_invoices_unpaid' => SubscriptionInvoice::withoutGlobalScopes()->whereIn('status', ['pending', 'failed', 'expired'])->count(),
                'reservations_paid' => Reservation::withoutGlobalScopes()
                    ->where('xendit_payment_status', 'paid')
                    ->revenueEligible()
                    ->count(),
                'commissions_pending' => $this->commissionScope->scopeBookingCommissionsOnly(
                    Commission::query()->where('status', 'pending')
                )->count(),
                'commissions_released' => $this->commissionScope->scopeBookingCommissionsOnly(
                    Commission::query()->where('status', 'released')
                )->count(),
                'payout_batches_total' => MarketerPayoutBatch::query()->count(),
            ],
        ], 'Finance overview');
    }

    /** Unified subscription + guest booking payment ledger (paginated). */
    public function paymentLedger(Request $request)
    {
        $perPage = max(5, min(100, (int) $request->integer('per_page', 20)));
        $type = $request->string('type')->toString() ?: 'all';
        $from = $request->date('from');
        $to = $request->date('to');

        $subBase = DB::table('subscription_invoices as si')
            ->join('resorts as r', 'r.id', '=', 'si.resort_id')
            ->selectRaw("'subscription' as entry_type")
            ->addSelect([
                'si.id as entry_id',
                'si.xendit_invoice_id as reference',
                'r.id as resort_id',
                'r.name as resort_name',
                'si.amount as amount',
                DB::raw("'PHP' as currency"),
                'si.status as status',
                'si.referral_code as referral_code',
                'si.marketer_id as marketer_id',
                DB::raw('COALESCE(si.paid_at, si.updated_at, si.created_at) as occurred_at'),
                'si.created_at as created_at',
            ]);

        $bookBase = DB::table('reservations as res')
            ->join('resorts as r', 'r.id', '=', 'res.resort_id')
            ->selectRaw("'booking' as entry_type")
            ->addSelect([
                'res.id as entry_id',
                DB::raw('COALESCE(res.xendit_invoice_id, res.reference_no) as reference'),
                'r.id as resort_id',
                'r.name as resort_name',
                'res.reservation_fee as amount',
                DB::raw("'PHP' as currency"),
                DB::raw(
                    "CASE WHEN res.status = 'cancelled' THEN 'cancelled'
                          WHEN res.status = 'expired' THEN 'expired'
                          WHEN LOWER(COALESCE(res.xendit_payment_status,'')) = 'paid' THEN 'paid'
                          ELSE COALESCE(res.xendit_payment_status, res.status) END as status"
                ),
                DB::raw('NULL as referral_code'),
                DB::raw('NULL as marketer_id'),
                DB::raw('COALESCE(res.reserved_at, res.updated_at, res.created_at) as occurred_at'),
                'res.created_at as created_at',
            ]);

        if ($from) {
            $subBase->whereDate(DB::raw('COALESCE(si.paid_at, si.created_at)'), '>=', $from);
            $bookBase->whereDate(DB::raw('COALESCE(res.reserved_at, res.created_at)'), '>=', $from);
        }
        if ($to) {
            $subBase->whereDate(DB::raw('COALESCE(si.paid_at, si.created_at)'), '<=', $to);
            $bookBase->whereDate(DB::raw('COALESCE(res.reserved_at, res.created_at)'), '<=', $to);
        }

        if ($type === 'subscription') {
            $q = DB::query()->fromSub($subBase, 'ledger')->orderByDesc('occurred_at');
        } elseif ($type === 'booking') {
            $q = DB::query()->fromSub($bookBase, 'ledger')->orderByDesc('occurred_at');
        } else {
            $union = $subBase->unionAll($bookBase);
            $q = DB::query()->fromSub($union, 'ledger')->orderByDesc('occurred_at');
        }

        $page = $q->paginate($perPage);
        $payload = $page->through(function (object $row): array {
            return [
                'entry_type' => $row->entry_type,
                'entry_id' => (int) $row->entry_id,
                'reference' => $row->reference,
                'resort_id' => (int) $row->resort_id,
                'resort_name' => $row->resort_name,
                'amount' => round((float) $row->amount, 2),
                'currency' => $row->currency,
                'status' => (string) $row->status,
                'referral_code' => $row->referral_code,
                'marketer_id' => $row->marketer_id !== null ? (int) $row->marketer_id : null,
                'occurred_at' => $row->occurred_at,
                'created_at' => $row->created_at,
            ];
        });

        return $this->successResponse($payload, 'Payment ledger');
    }

    /** All marketer commissions (admin). */
    public function commissions(Request $request)
    {
        $perPage = max(5, min(100, (int) $request->integer('per_page', 20)));
        $status = $request->string('status')->toString();

        $q = $this->commissionScope->scopeBookingCommissionsOnly(Commission::query())
            ->with([
                'marketer:id,name,email',
                'resort:id,name',
                'payoutBatch:id,reference_id,status,total_amount,run_period',
            ]);

        if ($status !== '') {
            $q->where('status', $status);
        }

        $page = $q->orderByDesc('id')->paginate($perPage);

        $page->getCollection()->transform(function (Commission $commission) {
            $tier = (string) ($commission->marketer_tier ?? '');
            $commission->setAttribute(
                'commission_source',
                $tier === 'booking_flat' ? 'booking_commission' : 'subscription_legacy',
            );

            return $commission;
        });

        $summary = [
            'pending_count' => $this->commissionScope->scopeBookingCommissionsOnly(
                Commission::query()->where('status', 'pending')
            )->count(),
            'released_count' => $this->commissionScope->scopeBookingCommissionsOnly(
                Commission::query()->where('status', 'released')
            )->count(),
            'pending_gross' => round((float) $this->commissionScope->scopeBookingCommissionsOnly(
                Commission::query()->where('status', 'pending')
            )->sum('commission_amount'), 2),
            'released_gross' => round((float) $this->commissionScope->scopeBookingCommissionsOnly(
                Commission::query()->where('status', 'released')
            )->sum('commission_amount'), 2),
        ];

        return $this->successResponse([
            'summary' => $summary,
            'commissions' => $page,
        ], 'Commissions');
    }

    /** Payout batches with gross vs net (withholding) for monitoring. */
    public function withholdingBatches(Request $request)
    {
        $perPage = max(5, min(100, (int) $request->integer('per_page', 15)));
        $status = $request->string('status')->toString();

        $grossSub = DB::table('marketer_payout_batch_items as bi')
            ->join('commissions as c', 'c.id', '=', 'bi.commission_id')
            ->select('bi.batch_id', DB::raw('SUM(c.commission_amount) as gross_total'))
            ->groupBy('bi.batch_id');

        $q = MarketerPayoutBatch::query()
            ->leftJoinSub($grossSub, 'g', 'g.batch_id', '=', 'marketer_payout_batches.id')
            ->with(['marketer:id,name,email'])
            ->select('marketer_payout_batches.*', DB::raw('COALESCE(g.gross_total, 0) as gross_commissions'));

        if ($status !== '') {
            $q->where('marketer_payout_batches.status', $status);
        }

        $page = $q->orderByDesc('marketer_payout_batches.id')->paginate($perPage);

        $mapped = $page->through(function (MarketerPayoutBatch $batch): array {
            $grossJoined = round((float) ($batch->gross_commissions ?? 0), 2);
            $gross = $batch->gross_commissions_total !== null
                ? round((float) $batch->gross_commissions_total, 2)
                : $grossJoined;
            $net = round((float) $batch->total_amount, 2);
            $withheld = round(max(0, $gross - $net), 2);

            return [
                'id' => $batch->id,
                'marketer_id' => $batch->marketer_id,
                'marketer' => $batch->marketer,
                'run_period' => $batch->run_period,
                'reference_id' => $batch->reference_id,
                'currency' => $batch->currency,
                'status' => $batch->status,
                'gross_commissions' => $gross,
                'net_disbursed' => $net,
                'withheld' => $withheld,
                'withholding_rate_effective' => $gross > 0 ? round($withheld / $gross, 4) : null,
                'xendit_payout_id' => $batch->xendit_payout_id,
                'failure_message' => $batch->failure_message,
                'submitted_at' => $batch->submitted_at,
                'completed_at' => $batch->completed_at,
                'created_at' => $batch->created_at,
                'withholding_rate_applied' => $batch->withholding_rate_applied !== null
                    ? round((float) $batch->withholding_rate_applied, 4)
                    : null,
                'destination_type' => $batch->usesBankDestination() ? 'bank' : ($batch->usesLegacyGcashDestination() ? 'gcash' : 'unknown'),
                'bank_channel_code' => $batch->payout_channel_code_snapshot,
                'bank_last4' => $batch->bank_account_last4_snapshot ?? $batch->gcash_last4_snapshot,
                'bank_display_name' => $batch->bank_display_name_snapshot,
            ];
        });

        $totals = [
            'all_batches_count' => MarketerPayoutBatch::query()->count(),
            'succeeded_gross' => round((float) DB::table('marketer_payout_batch_items as bi')
                ->join('marketer_payout_batches as b', 'b.id', '=', 'bi.batch_id')
                ->join('commissions as c', 'c.id', '=', 'bi.commission_id')
                ->where('b.status', MarketerPayoutBatch::STATUS_SUCCEEDED)
                ->sum('c.commission_amount'), 2),
            'succeeded_net' => round((float) MarketerPayoutBatch::query()
                ->where('status', MarketerPayoutBatch::STATUS_SUCCEEDED)
                ->sum('total_amount'), 2),
        ];
        $totals['succeeded_withheld'] = round(max(0, $totals['succeeded_gross'] - $totals['succeeded_net']), 2);

        return $this->successResponse([
            'summary' => $totals,
            'batches' => $mapped,
        ], 'Withholding batches');
    }

    /** Commission releases (manual + Xendit) for audit trail. */
    public function commissionReleases(Request $request)
    {
        $perPage = max(5, min(100, (int) $request->integer('per_page', 20)));

        $page = CommissionRelease::query()
            ->with([
                'commission.marketer:id,name,email',
                'commission.resort:id,name',
                'releasedByUser:id,name',
                'payoutBatch:id,reference_id,status',
            ])
            ->orderByDesc('released_at')
            ->paginate($perPage);

        return $this->successResponse($page, 'Commission releases');
    }
}
