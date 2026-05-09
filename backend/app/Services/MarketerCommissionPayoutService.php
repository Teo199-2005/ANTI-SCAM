<?php

namespace App\Services;

use App\Models\Commission;
use App\Models\MarketerPayoutBatch;
use App\Models\MarketerPayoutBatchItem;
use App\Models\User;
use App\Modules\Billing\Services\XenditPayoutService;
use App\Support\GcashAccountNormalizer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class MarketerCommissionPayoutService
{
    public function __construct(private readonly XenditPayoutService $xenditPayout) {}

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

        $tz = (string) config('services.marketing_payout.timezone', 'Asia/Manila');
        $run = $asOf->copy()->timezone($tz);
        $runPeriod = $run->format('Y-m');
        $cutoffPeriod = $run->copy()->subMonthNoOverflow()->format('Y-m');
        $minPhp = (float) config('services.marketing_payout.min_php', 1);

        $marketerIds = Commission::query()
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
                $lock = Cache::lock('marketer_payout:'.$marketerId.':'.$runPeriod, 120);
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

        $gcash = GcashAccountNormalizer::normalizeMobile((string) ($marketer->gcash_account_number ?? ''));
        $holder = GcashAccountNormalizer::normalizeHolderName((string) ($marketer->gcash_account_holder_name ?? ''));
        if (! $gcash['ok'] || $holder === '' || strlen($holder) < 2) {
            return ['action' => 'skip', 'message' => 'GCash payout details incomplete'];
        }

        $previewCount = Commission::query()
            ->where('marketer_id', $marketerId)
            ->where('status', 'pending')
            ->whereNull('payout_batch_id')
            ->where('period', '<=', $cutoffPeriod)
            ->count();

        if ($previewCount === 0) {
            return ['action' => 'skip', 'message' => 'no eligible commissions'];
        }

        $previewCommissions = Commission::query()
            ->where('marketer_id', $marketerId)
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

        $rate = $this->withholdingRate();

        if ($dryRun) {
            $pct = round($rate * 100, 2);

            return ['action' => 'dry_run', 'message' => "dry-run: gross {$grossPreview} PHP → net payout {$netPreview} PHP after {$pct}% withholding ({$previewCount} commissions)"];
        }

        $batchId = DB::transaction(function () use ($marketerId, $runPeriod, $cutoffPeriod): int {
            $commissions = Commission::query()
                ->where('marketer_id', $marketerId)
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
                'currency' => 'PHP',
                'status' => MarketerPayoutBatch::STATUS_PENDING_SUBMIT,
            ]);

            $sumNet = 0.0;
            foreach ($commissions as $c) {
                $netAmt = $alloc['by_id'][$c->id] ?? 0.0;
                if ($netAmt < 0 || $netAmt > round((float) $c->commission_amount, 2) + 0.0001) {
                    throw new RuntimeException('Invalid net allocation for commission '.$c->id);
                }
                MarketerPayoutBatchItem::query()->create([
                    'batch_id' => $batch->id,
                    'commission_id' => $c->id,
                    'amount' => $netAmt,
                ]);
                $sumNet += $netAmt;
                $c->update(['payout_batch_id' => $batch->id]);
            }
            $sumNet = round($sumNet, 2);
            if ($sumNet !== $netLocked) {
                throw new RuntimeException('Net payout total mismatch after line items.');
            }

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

    public function submitBatchToXendit(int $batchId): void
    {
        $batch = MarketerPayoutBatch::query()->find($batchId);
        if (! $batch || $batch->status !== MarketerPayoutBatch::STATUS_PENDING_SUBMIT) {
            return;
        }

        $marketer = User::query()->find($batch->marketer_id);
        if (! $marketer) {
            $this->abortBatch($batch, 'Marketer missing');

            return;
        }

        $gcash = GcashAccountNormalizer::normalizeMobile((string) ($marketer->gcash_account_number ?? ''));
        $holder = GcashAccountNormalizer::normalizeHolderName((string) ($marketer->gcash_account_holder_name ?? ''));
        if (! $gcash['ok'] || $holder === '') {
            $this->abortBatch($batch, 'Invalid GCash details at submit time');

            return;
        }

        $itemSum = round((float) $batch->items()->sum('amount'), 2);
        if ($itemSum !== (float) $batch->total_amount) {
            $this->abortBatch($batch, 'Batch items do not match total');

            return;
        }

        try {
            $resp = $this->xenditPayout->createGcashPayout(
                $batch->reference_id,
                (float) $batch->total_amount,
                (string) $gcash['normalized'],
                $holder,
                'Commission payout '.$batch->run_period,
            );
            $batch->update([
                'status' => MarketerPayoutBatch::STATUS_SUBMITTED,
                'xendit_payout_id' => $resp['id'],
                'submitted_at' => now(),
            ]);
        } catch (Throwable $e) {
            $this->abortBatch($batch, $e->getMessage());
            throw $e;
        }
    }

    private function abortBatch(MarketerPayoutBatch $batch, string $reason): void
    {
        DB::transaction(function () use ($batch, $reason): void {
            Commission::query()->where('payout_batch_id', $batch->id)->update(['payout_batch_id' => null]);
            $batch->items()->delete();
            $batch->update([
                'status' => MarketerPayoutBatch::STATUS_FAILED,
                'failure_message' => $reason,
                'completed_at' => now(),
            ]);
        });
    }
}
