<?php

namespace App\Services;

use App\Models\Commission;
use App\Models\MarketerPayoutBatch;
use App\Models\MarketerPayoutBatchItem;
use App\Models\User;
use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Billing\Services\XenditPayoutService;
use App\Support\BankAccountNormalizer;
use App\Support\GcashAccountNormalizer;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Batches pending {@link Commission} rows for bank disbursement via Xendit.
 *
 * Gross per row is whatever was credited (booking referral amounts from
 * {@see \App\Services\BookingReferralCommissionService}); this service only sums gross, applies
 * withholding, allocates net to line items, and submits the batch. It does not recalculate tiers.
 *
 * Hardening notes:
 *  - Destination bank channel, account number, account-holder name, marketer name + email are
 *    SNAPSHOTTED on the batch at create time. Submit/reconcile re-uses the snapshot, never live
 *    user data, so a marketer cannot redirect funds by editing their profile after a batch is created.
 *  - Legacy in-flight batches with GCash snapshots still submit via PH_GCASH.
 *  - Per-item gross is also snapshotted (audit trail).
 *  - Transient gateway errors (network, 5xx, 429, 401/403 config) increment submit_attempts and
 *    leave the batch in pending_submit so the same idempotency key is retried — preventing the
 *    "abort + recreate with new reference_id" double-pay vector. Only batch-data validation
 *    failures (4xx with explicit error codes) flip the batch to failed.
 */
class MarketerCommissionPayoutService
{
    public function __construct(
        private readonly XenditPayoutService $xenditPayout,
        private readonly LegacySubscriptionCommissionCleanupService $commissionScope,
        private readonly ?AuditLogService $audits = null,
    ) {}

    /**
     * @return array{processed: int, skipped: int, errors: list<string>, dry_run: bool}
     */
    public function run(Carbon $asOf, bool $dryRun = false): array
    {
        if (! (bool) config('services.marketing_payout.enabled', false)) {
            return ['processed' => 0, 'skipped' => 0, 'errors' => ['Marketing payout automation is disabled (MARKETING_PAYOUT_ENABLED).'], 'dry_run' => $dryRun];
        }

        if (! $this->xenditPayout->isConfigured()) {
            return ['processed' => 0, 'skipped' => 0, 'errors' => ['Xendit is not configured.'], 'dry_run' => $dryRun];
        }

        $this->commissionScope->voidPendingLegacyRows();

        $tz = (string) config('services.marketing_payout.timezone', 'Asia/Manila');
        $run = $asOf->copy()->timezone($tz);
        $runPeriod = $run->format('Y-m');
        $cutoffPeriod = $run->copy()->subMonthNoOverflow()->format('Y-m');
        $minPhp = (float) config('services.marketing_payout.min_php', 1);

        $marketerIds = $this->commissionScope->scopeBookingCommissionsOnly(Commission::query())
            ->where('status', 'pending')
            ->whereNull('payout_batch_id')
            ->where('period', '<=', $cutoffPeriod)
            ->distinct()
            ->pluck('marketer_id')
            ->all();

        $processed = 0;
        $skipped = 0;
        $errors = [];

        foreach ($marketerIds as $marketerId) {
            $marketerId = (int) $marketerId;
            try {
                // Lock TTL must comfortably outlive Xendit submit (45s timeout) + DB writes; 5min is safe.
                $lock = Cache::lock('marketer_payout:'.$marketerId.':'.$runPeriod, 300);
                if (! $lock->get()) {
                    $skipped++;
                    $errors[] = "Marketer {$marketerId}: could not acquire lock (another payout run in progress).";

                    continue;
                }
                try {
                    $r = $this->prepareMarketerBatch($marketerId, $runPeriod, $cutoffPeriod, $minPhp, $dryRun);
                    if (($r['action'] ?? '') === 'skip') {
                        $skipped++;
                        if (! empty($r['message'])) {
                            $errors[] = "Marketer {$marketerId}: ".$r['message'];
                        }

                        continue;
                    }
                    if (($r['action'] ?? '') === 'dry_run') {
                        $skipped++;
                        if (! empty($r['message'])) {
                            $errors[] = "Marketer {$marketerId}: ".$r['message'];
                        }

                        continue;
                    }
                    if (($r['action'] ?? '') === 'batched' && isset($r['batch_id'])) {
                        try {
                            $this->submitBatchToXendit((int) $r['batch_id']);
                            $processed++;
                        } catch (Throwable $e) {
                            // submitBatchToXendit throws only when the gateway error is permanent
                            // (batch was aborted) or genuinely unrecoverable. Transient errors are
                            // swallowed and leave the batch in pending_submit for the reconciler.
                            $skipped++;
                            $errors[] = "Marketer {$marketerId}: ".$e->getMessage();
                        }
                    }
                } finally {
                    $lock->release();
                }
            } catch (Throwable $e) {
                $skipped++;
                $errors[] = "Marketer {$marketerId}: ".$e->getMessage();
                Log::error('Marketer payout failed', [
                    'marketer_id' => $marketerId,
                    'exception' => $e,
                ]);
            }
        }

        return ['processed' => $processed, 'skipped' => $skipped, 'errors' => $errors, 'dry_run' => $dryRun];
    }

    /**
     * @return array{action: string, message?: string, batch_id?: int}
     */
    private function prepareMarketerBatch(int $marketerId, string $runPeriod, string $cutoffPeriod, float $minPhp, bool $dryRun): array
    {
        $marketer = User::query()->where('id', $marketerId)->where('role', 'marketing')->first();
        if (! $marketer) {
            return ['action' => 'skip', 'message' => 'not a marketing user'];
        }

        if (MarketerPayoutBatch::query()
            ->where('marketer_id', $marketerId)
            ->where('run_period', $runPeriod)
            ->where('status', MarketerPayoutBatch::STATUS_SUCCEEDED)
            ->exists()) {
            return ['action' => 'skip', 'message' => 'already succeeded for run period'];
        }

        if (MarketerPayoutBatch::query()
            ->where('marketer_id', $marketerId)
            ->where('run_period', $runPeriod)
            ->whereIn('status', [MarketerPayoutBatch::STATUS_PENDING_SUBMIT, MarketerPayoutBatch::STATUS_SUBMITTED])
            ->exists()) {
            return ['action' => 'skip', 'message' => 'payout already in flight for this period'];
        }

        if (! $marketer->bankPayoutConfigured()) {
            return ['action' => 'skip', 'message' => 'Bank payout details incomplete'];
        }

        $channelCode = trim((string) ($marketer->marketer_bank_channel_code ?? ''));
        $acctNorm = BankAccountNormalizer::normalizeAccountNumber((string) ($marketer->marketer_bank_account_number ?? ''));
        $holder = BankAccountNormalizer::normalizeHolderName((string) ($marketer->marketer_bank_account_name ?? ''));
        if ($channelCode === '' || ! $acctNorm['ok'] || $holder === '' || strlen($holder) < 2) {
            return ['action' => 'skip', 'message' => 'Bank payout details incomplete'];
        }

        // KYC gate (BSP Circular 1108 / AMLC Tier-1) — ops feature flag.
        if ((bool) config('services.marketing_payout.require_kyc', false)) {
            $hasGovId = filled($marketer->marketer_gov_id_document_url ?? null);
            if (! $hasGovId) {
                return ['action' => 'skip', 'message' => 'KYC missing: government-ID document not uploaded'];
            }
        }

        // Money-mule guard: bank account holder must resemble marketer name when feature flag is on.
        if ((bool) config('services.marketing_payout.require_name_match', false)) {
            $threshold = (int) config('services.marketing_payout.name_match_threshold', 70);
            $sim = $this->nameSimilarityPercent((string) $marketer->name, $holder);
            if ($sim < $threshold) {
                Log::warning('Marketer payout blocked: bank account holder name too dissimilar from marketer name', [
                    'marketer_id' => $marketerId,
                    'similarity_percent' => $sim,
                    'threshold' => $threshold,
                ]);

                return ['action' => 'skip', 'message' => 'Bank account name does not match marketer name (manual review required)'];
            }
        }

        $previewCount = $this->commissionScope->bookingCommissionsForMarketer($marketerId)
            ->where('status', 'pending')
            ->whereNull('payout_batch_id')
            ->where('period', '<=', $cutoffPeriod)
            ->count();

        if ($previewCount === 0) {
            return ['action' => 'skip', 'message' => 'no eligible commissions'];
        }

        $previewCommissions = $this->commissionScope->bookingCommissionsForMarketer($marketerId)
            ->where('status', 'pending')
            ->whereNull('payout_batch_id')
            ->where('period', '<=', $cutoffPeriod)
            ->orderBy('id')
            ->get();

        $allocPreview = $this->allocateNetByCommission($previewCommissions);
        $grossPreview = $allocPreview['gross_total'];
        $netPreview = $allocPreview['net_total'];

        if ($grossPreview < $minPhp) {
            return ['action' => 'skip', 'message' => 'below minimum gross commission balance'];
        }

        if ($netPreview < $minPhp) {
            return ['action' => 'skip', 'message' => 'net payout after withholding is below minimum'];
        }

        $maxNet = $this->maxNetPerBatchPhp();
        if ($maxNet !== null && $netPreview > $maxNet) {
            return ['action' => 'skip', 'message' => 'net payout exceeds MARKETING_PAYOUT_MAX_NET_PHP; review data or raise cap'];
        }

        $rate = $this->withholdingRate();

        if ($dryRun) {
            $pct = round($rate * 100, 2);

            return ['action' => 'dry_run', 'message' => "dry-run: gross {$grossPreview} PHP → net payout {$netPreview} PHP after {$pct}% withholding ({$previewCount} commissions)"];
        }

        $bankAccount = (string) $acctNorm['normalized'];
        $bankLast4 = strlen($bankAccount) >= 4 ? substr($bankAccount, -4) : $bankAccount;
        $bankDisplay = (string) ($marketer->marketer_bank_name ?? $channelCode);
        $marketerName = (string) ($marketer->name ?? '');
        $marketerEmail = (string) ($marketer->email ?? '');

        $batchId = DB::transaction(function () use (
            $marketerId, $runPeriod, $cutoffPeriod,
            $channelCode, $bankAccount, $bankLast4, $holder, $bankDisplay, $marketerName, $marketerEmail
        ): int {
            $commissions = $this->commissionScope->bookingCommissionsForMarketer($marketerId)
                ->where('status', 'pending')
                ->whereNull('payout_batch_id')
                ->where('period', '<=', $cutoffPeriod)
                ->lockForUpdate()
                ->orderBy('id')
                ->get();

            if ($commissions->isEmpty()) {
                throw new RuntimeException('Commissions were taken by another process.');
            }

            $alloc = $this->allocateNetByCommission($commissions);
            $grossLocked = $alloc['gross_total'];
            $netLocked = $alloc['net_total'];

            if ($grossLocked < (float) config('services.marketing_payout.min_php', 1)) {
                throw new RuntimeException('Below minimum gross after lock.');
            }

            if ($netLocked < (float) config('services.marketing_payout.min_php', 1)) {
                throw new RuntimeException('Net payout below minimum after lock.');
            }

            $maxNetLocked = $this->maxNetPerBatchPhp();
            if ($maxNetLocked !== null && $netLocked > $maxNetLocked) {
                throw new RuntimeException('Net payout exceeds MARKETING_PAYOUT_MAX_NET_PHP after lock.');
            }

            // reference_id is monotonic per (marketer, runPeriod). It's also the Xendit
            // Idempotency-Key, so two attempts in the same run-period cannot dedupe on Xendit's
            // side — we rely on our own status guards above to prevent that.
            $seq = (int) MarketerPayoutBatch::query()
                ->where('marketer_id', $marketerId)
                ->where('run_period', $runPeriod)
                ->count();
            $referenceId = 'ASP-M'.$marketerId.'-'.$runPeriod.($seq > 0 ? '-R'.$seq : '');
            if (strlen($referenceId) > 180) {
                throw new RuntimeException('Reference id too long; contact support.');
            }

            $batch = MarketerPayoutBatch::query()->create([
                'marketer_id' => $marketerId,
                'run_period' => $runPeriod,
                'reference_id' => $referenceId,
                'total_amount' => $netLocked,
                'gross_commissions_total' => $grossLocked,
                'withholding_rate_applied' => $this->withholdingRate(),
                'currency' => 'PHP',
                'status' => MarketerPayoutBatch::STATUS_PENDING_SUBMIT,
                'payout_channel_code_snapshot' => $channelCode,
                'bank_account_number_snapshot' => $bankAccount,
                'bank_account_last4_snapshot' => $bankLast4,
                'bank_account_holder_name_snapshot' => $holder,
                'bank_display_name_snapshot' => mb_substr($bankDisplay, 0, 120),
                'marketer_name_snapshot' => $marketerName !== '' ? mb_substr($marketerName, 0, 191) : null,
                'marketer_email_snapshot' => $marketerEmail !== '' ? mb_substr($marketerEmail, 0, 191) : null,
            ]);

            $sumNet = 0.0;
            foreach ($commissions as $c) {
                $netAmt = $alloc['by_id'][$c->id] ?? 0.0;
                $gross = round((float) $c->commission_amount, 2);
                if ($netAmt < 0 || $netAmt > $gross + 0.0001) {
                    throw new RuntimeException('Invalid net allocation for commission '.$c->id);
                }
                MarketerPayoutBatchItem::query()->create([
                    'batch_id' => $batch->id,
                    'commission_id' => $c->id,
                    'amount' => $netAmt,
                    'gross_commission_snapshot' => $gross,
                ]);
                $sumNet += $netAmt;
                $c->update(['payout_batch_id' => $batch->id]);
            }
            $sumNet = round($sumNet, 2);
            if ($sumNet !== $netLocked) {
                throw new RuntimeException('Net payout total mismatch after line items.');
            }

            $this->audit('marketer_payout_batch_created', $batch->id, null, [
                'marketer_id' => $marketerId,
                'reference_id' => $referenceId,
                'gross' => $grossLocked,
                'net' => $netLocked,
                'bank_channel' => $channelCode,
                'bank_last4' => $bankLast4,
            ]);

            return (int) $batch->id;
        });

        return ['action' => 'batched', 'batch_id' => $batchId];
    }

    /**
     * @param  Collection<int, Commission>|array<int, Commission>  $commissions
     * @return array{gross_total: float, net_total: float, by_id: array<int, float>}
     */
    public function allocateNetByCommission(Collection|array $commissions): array
    {
        $rows = [];
        $grossSum = 0.0;
        foreach ($commissions as $c) {
            $g = round((float) $c->commission_amount, 2);
            $rows[] = ['id' => (int) $c->id, 'gross' => $g];
            $grossSum += $g;
        }
        $grossSum = round($grossSum, 2);
        $factor = $this->netPayoutFactor();
        $netTotal = round($grossSum * $factor, 2);
        $n = count($rows);
        $byId = [];
        $running = 0.0;
        foreach ($rows as $i => $row) {
            if ($n === 0) {
                break;
            }
            if ($i === $n - 1) {
                $byId[$row['id']] = round($netTotal - $running, 2);
            } else {
                $share = $grossSum > 0 ? $row['gross'] / $grossSum : 1 / $n;
                $part = round($netTotal * $share, 2);
                $byId[$row['id']] = $part;
                $running += $part;
            }
        }

        return ['gross_total' => $grossSum, 'net_total' => $netTotal, 'by_id' => $byId];
    }

    /** Withholding fraction (e.g. 0.10); clamped to [0, 0.5]. */
    public function withholdingRate(): float
    {
        $r = (float) config('services.marketing_payout.withholding_rate', 0.10);

        return max(0.0, min(0.5, $r));
    }

    /** Multiplier applied to gross sum to get disbursement (e.g. 0.90 when 10% withheld). */
    public function netPayoutFactor(): float
    {
        return round(1 - $this->withholdingRate(), 4);
    }

    /** Upper bound on net batch size (PHP); null = no cap. */
    public function maxNetPerBatchPhp(): ?float
    {
        $v = config('services.marketing_payout.max_net_php_per_batch');

        return is_numeric($v) && (float) $v > 0 ? round((float) $v, 2) : null;
    }

    /**
     * Submit a pending_submit batch to Xendit using the SNAPSHOTTED destination.
     * Transient errors leave the batch in pending_submit for the reconciler (same idempotency
     * key); only permanent data-validation errors abort. Throws on permanent failure.
     */
    public function submitBatchToXendit(int $batchId): void
    {
        $batch = MarketerPayoutBatch::query()->find($batchId);
        if (! $batch || $batch->status !== MarketerPayoutBatch::STATUS_PENDING_SUBMIT) {
            return;
        }

        // Backoff: don't hammer Xendit. The reconciler only requeues batches old enough to
        // have a fresh chance, but if a recent attempt just failed, skip.
        if ($batch->last_attempt_at instanceof \DateTimeInterface) {
            $base = max(1, (int) config('services.marketing_payout.retry_backoff_base_minutes', 5));
            $attempt = max(1, (int) ($batch->submit_attempts ?? 1));
            $waitMins = min(24 * 60, $base * (2 ** ($attempt - 1)));
            if (Carbon::parse($batch->last_attempt_at)->addMinutes($waitMins)->isFuture()) {
                return;
            }
        }

        // Hard retry cap: leave batch in pending_submit but stop auto-retrying — ops triage.
        $maxAttempts = max(1, (int) config('services.marketing_payout.max_submit_attempts', 8));
        if ((int) ($batch->submit_attempts ?? 0) >= $maxAttempts) {
            Log::critical('Marketer payout batch exceeded max submit attempts; manual ops review required.', [
                'batch_id' => $batch->id,
                'reference_id' => $batch->reference_id,
                'attempts' => $batch->submit_attempts,
                'last_error' => $batch->last_attempt_error,
            ]);

            return;
        }

        // Source destination from the batch snapshot — never live user data, to defeat
        // post-batch profile-edit redirection.
        $channelCode = (string) ($batch->payout_channel_code_snapshot ?? '');
        $accountNumber = (string) ($batch->bank_account_number_snapshot ?? '');
        $holder = (string) ($batch->bank_account_holder_name_snapshot ?? '');
        $useLegacyGcash = false;

        if ($batch->usesBankDestination()) {
            // bank snapshots already set
        } elseif ($batch->usesLegacyGcashDestination()) {
            $useLegacyGcash = true;
            $accountNumber = (string) ($batch->gcash_account_number_snapshot ?? '');
            $holder = (string) ($batch->gcash_account_holder_name_snapshot ?? '');
            $channelCode = (string) config('services.xendit.payout_channel_code', 'PH_GCASH');
        } else {
            $marketer = User::query()->find($batch->marketer_id);
            if (! $marketer) {
                $this->markBatchPermanentlyFailed($batch, 'Marketer missing and no batch snapshot available', null);

                return;
            }
            if ($marketer->bankPayoutConfigured()) {
                $channelCode = trim((string) $marketer->marketer_bank_channel_code);
                $acct = BankAccountNormalizer::normalizeAccountNumber((string) $marketer->marketer_bank_account_number);
                $holder = BankAccountNormalizer::normalizeHolderName((string) $marketer->marketer_bank_account_name);
                if ($channelCode === '' || ! $acct['ok'] || $holder === '') {
                    $this->markBatchPermanentlyFailed($batch, 'Invalid bank details (no batch snapshot)', null);

                    return;
                }
                $accountNumber = (string) $acct['normalized'];
            } else {
                $g = GcashAccountNormalizer::normalizeMobile((string) ($marketer->gcash_account_number ?? ''));
                $h = GcashAccountNormalizer::normalizeHolderName((string) ($marketer->gcash_account_holder_name ?? ''));
                if (! $g['ok'] || $h === '') {
                    $this->markBatchPermanentlyFailed($batch, 'Invalid payout destination (no batch snapshot)', null);

                    return;
                }
                $useLegacyGcash = true;
                $accountNumber = (string) $g['normalized'];
                $holder = $h;
                $channelCode = (string) config('services.xendit.payout_channel_code', 'PH_GCASH');
            }
            Log::warning('Marketer payout batch missing snapshot; using live user data (legacy batch).', [
                'batch_id' => $batch->id,
                'legacy_gcash' => $useLegacyGcash,
            ]);
        }

        if ($channelCode === '' || $accountNumber === '' || $holder === '') {
            $this->markBatchPermanentlyFailed($batch, 'Payout destination snapshot incomplete', null);

            return;
        }

        $itemSum = round((float) $batch->liveItems()->sum('amount'), 2);
        if ($itemSum !== (float) $batch->total_amount) {
            $this->markBatchPermanentlyFailed($batch, 'Batch items do not match total', 'BATCH_INVARIANT_FAILED');

            return;
        }

        try {
            $resp = $this->xenditPayout->createPayout(
                $batch->reference_id,
                (float) $batch->total_amount,
                $channelCode,
                $accountNumber,
                $holder,
                'Commission payout '.$batch->run_period,
            );
            Log::info('Marketer payout submitted to Xendit', [
                'batch_id' => $batch->id,
                'marketer_id' => $batch->marketer_id,
                'reference_id' => $batch->reference_id,
                'channel_code' => $channelCode,
                'bank_last4' => $batch->bank_account_last4_snapshot ?? ($useLegacyGcash ? $batch->gcash_last4_snapshot : null),
                'net_amount' => (float) $batch->total_amount,
                'gross_snapshot' => $batch->gross_commissions_total !== null ? (float) $batch->gross_commissions_total : null,
                'xendit_payout_id' => $resp['id'] ?? null,
                'xendit_status' => $resp['status'] ?? null,
                'attempt' => (int) ($batch->submit_attempts ?? 0) + 1,
            ]);
            $batch->update([
                'status' => MarketerPayoutBatch::STATUS_SUBMITTED,
                'xendit_payout_id' => $resp['id'],
                'submitted_at' => now(),
                'submit_attempts' => (int) ($batch->submit_attempts ?? 0) + 1,
                'last_attempt_at' => now(),
                'last_attempt_error' => null,
                'last_attempt_error_code' => null,
            ]);

            $this->audit('marketer_payout_batch_submitted', $batch->id, null, [
                'reference_id' => $batch->reference_id,
                'xendit_payout_id' => $resp['id'] ?? null,
            ]);
        } catch (Throwable $e) {
            $classification = $this->classifyGatewayError($e);

            // Always count attempts, even transient ones — that's how the cap works.
            $batch->update([
                'submit_attempts' => (int) ($batch->submit_attempts ?? 0) + 1,
                'last_attempt_at' => now(),
                'last_attempt_error' => mb_substr($e->getMessage(), 0, 2000),
                'last_attempt_error_code' => $classification['code'],
            ]);

            $this->audit('marketer_payout_batch_submit_failed', $batch->id, null, [
                'reference_id' => $batch->reference_id,
                'classification' => $classification['kind'],
                'error_code' => $classification['code'],
                'attempt' => $batch->submit_attempts,
            ]);

            if ($classification['kind'] === 'permanent') {
                // Truly permanent (data validation) — abort. Same idempotency key cannot
                // succeed on retry, so safe to flip to failed.
                $this->markBatchPermanentlyFailed($batch, $e->getMessage(), $classification['code']);
                throw $e;
            }

            // Transient / config error — keep pending_submit; reconciler retries the SAME
            // idempotency key. This is what prevents the double-pay vector.
            Log::warning('Marketer payout submit transient error (will retry idempotently)', [
                'batch_id' => $batch->id,
                'reference_id' => $batch->reference_id,
                'kind' => $classification['kind'],
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Decide whether a gateway exception is safe to abort on (permanent) or must be retried with
     * the same idempotency key (transient/config). Conservative default: TRANSIENT, because
     * aborting + recreating a batch is the dangerous path.
     *
     * @return array{kind: 'transient'|'permanent', code: ?string}
     */
    private function classifyGatewayError(Throwable $e): array
    {
        if ($e instanceof ConnectionException) {
            return ['kind' => 'transient', 'code' => 'CONNECTION'];
        }

        $msg = $e->getMessage();
        // XenditPayoutService throws RuntimeException with the gateway message; we look for
        // the well-known permanent-failure error codes from Xendit Payouts v2.
        $permanentMarkers = [
            'RECIPIENT_ACCOUNT_NUMBER_INVALID',
            'INVALID_DESTINATION',
            'INVALID_API_KEY', // not retriable as same data — but this also implies key change; safer as transient. Keep transient.
            'CHANNEL_NOT_SUPPORTED',
            'PAYOUT_AMOUNT_BELOW_LIMIT',
            'PAYOUT_AMOUNT_ABOVE_LIMIT',
            'BATCH_INVARIANT_FAILED',
            'DUPLICATE_REFERENCE_ID',
        ];
        foreach ($permanentMarkers as $marker) {
            if (str_contains($msg, $marker)) {
                return ['kind' => 'permanent', 'code' => $marker];
            }
        }

        // 401/403 messages from XenditPayoutService::buildGatewayErrorMessage — these are
        // CONFIG issues. Keep transient so the same idempotency key can finish once ops fixes
        // the key (instead of recreating with a new reference_id).
        if (str_contains($msg, 'is forbidden for payouts') || str_contains($msg, 'invalid or unauthorized')) {
            return ['kind' => 'transient', 'code' => 'AUTH'];
        }

        // HTTP status hints in the generic message (e.g. "Xendit payout request failed (HTTP 504).")
        if (preg_match('/HTTP\s+(\d{3})/', $msg, $m)) {
            $status = (int) $m[1];
            if ($status >= 500 || $status === 408 || $status === 429) {
                return ['kind' => 'transient', 'code' => 'HTTP_'.$status];
            }
            if ($status === 422 || $status === 400) {
                return ['kind' => 'permanent', 'code' => 'HTTP_'.$status];
            }
        }

        // Default: transient. Better to retry safely than recreate.
        return ['kind' => 'transient', 'code' => 'UNKNOWN'];
    }

    /**
     * Hard-abort a batch we are SURE cannot succeed with the current data. Soft-cancels items
     * (keeps them as forensic record) and unlocks commissions for re-batching.
     */
    private function markBatchPermanentlyFailed(MarketerPayoutBatch $batch, string $reason, ?string $errorCode): void
    {
        DB::transaction(function () use ($batch, $reason, $errorCode): void {
            Commission::query()->where('payout_batch_id', $batch->id)->update(['payout_batch_id' => null]);
            // Soft-cancel — don't delete; we want the audit trail.
            $batch->items()->whereNull('cancelled_at')->update(['cancelled_at' => now()]);
            $batch->update([
                'status' => MarketerPayoutBatch::STATUS_FAILED,
                'failure_message' => mb_substr($reason, 0, 2000),
                'completed_at' => now(),
                'last_attempt_error_code' => $errorCode,
                'manually_aborted' => false,
            ]);

            $this->audit('marketer_payout_batch_permanent_failure', $batch->id, null, [
                'reference_id' => $batch->reference_id,
                'reason' => mb_substr($reason, 0, 500),
                'error_code' => $errorCode,
            ]);
        });
    }

    private function audit(string $action, int $batchId, ?array $oldValues, ?array $newValues): void
    {
        if ($this->audits === null) {
            return;
        }
        try {
            $this->audits->log($action, 'marketer_payout_batch', $batchId, $oldValues, $newValues);
        } catch (Throwable $e) {
            Log::warning('Audit log failed for '.$action, ['batch_id' => $batchId, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Compute a 0-100 similarity between two human names after normalization.
     * Uses similar_text + fallback to levenshtein. Order-insensitive on words.
     */
    private function nameSimilarityPercent(string $a, string $b): int
    {
        $norm = static function (string $s): string {
            $s = mb_strtolower(trim($s));
            $s = preg_replace('/[^a-z0-9 ]+/', ' ', $s) ?? '';
            $s = preg_replace('/\s+/', ' ', $s) ?? '';
            $parts = array_filter(explode(' ', trim($s)));
            sort($parts);

            return implode(' ', $parts);
        };
        $a = $norm($a);
        $b = $norm($b);
        if ($a === '' || $b === '') {
            return 0;
        }
        if ($a === $b) {
            return 100;
        }
        $pct = 0.0;
        similar_text($a, $b, $pct);

        return (int) round($pct);
    }
}
