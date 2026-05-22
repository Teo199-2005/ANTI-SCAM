<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\MarketerBookingCommissionEvent;
use App\Models\MarketerPayoutBatch;
use App\Models\Reservation;
use App\Models\SubscriptionInvoice;
use App\Models\User;
use App\Models\XenditWebhookEvent;
use App\Support\BulkDeleteResult;
use App\Support\FriendlyExceptionMessage;
use Illuminate\Support\Facades\DB;

/**
 * Admin-only hard deletes for clearing test / ops data from logs and finance tables.
 */
class AdminBulkDeleteService
{
    public const MAX_BATCH = 50;

    /**
     * @param  list<int>  $ids
     */
    public function deleteAuditLogs(array $ids): BulkDeleteResult
    {
        $result = new BulkDeleteResult;

        foreach ($this->capIds($ids) as $id) {
            $log = AuditLog::withoutGlobalScopes()->find($id);
            if (! $log) {
                $result->recordFailure($id, 'Audit log not found.');

                continue;
            }

            try {
                $log->delete();
                $result->recordSuccess();
            } catch (\Throwable $e) {
                $result->recordFailure($id, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<int>  $ids
     */
    public function deleteXenditWebhookEvents(array $ids): BulkDeleteResult
    {
        $result = new BulkDeleteResult;

        foreach ($this->capIds($ids) as $id) {
            $event = XenditWebhookEvent::query()->find($id);
            if (! $event) {
                $result->recordFailure($id, 'Webhook log not found.');

                continue;
            }

            try {
                $event->delete();
                $result->recordSuccess();
            } catch (\Throwable $e) {
                $result->recordFailure($id, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<array{entry_type: string, entry_id: int}>  $entries
     */
    public function deletePaymentLedgerEntries(array $entries): BulkDeleteResult
    {
        $result = new BulkDeleteResult;

        foreach (array_slice($entries, 0, self::MAX_BATCH) as $entry) {
            $type = (string) ($entry['entry_type'] ?? '');
            $id = (int) ($entry['entry_id'] ?? 0);
            $key = "{$type}:{$id}";

            if ($id < 1 || ! in_array($type, ['subscription', 'booking'], true)) {
                $result->recordFailure($key, 'Invalid ledger entry.');

                continue;
            }

            try {
                if ($type === 'subscription') {
                    $invoice = SubscriptionInvoice::query()->find($id);
                    if (! $invoice) {
                        $result->recordFailure($key, 'Subscription invoice not found.');

                        continue;
                    }
                    $invoice->delete();
                } else {
                    $reservation = Reservation::withoutGlobalScopes()->find($id);
                    if (! $reservation) {
                        $result->recordFailure($key, 'Reservation not found.');

                        continue;
                    }
                    DB::transaction(function () use ($reservation): void {
                        MarketerBookingCommissionEvent::query()
                            ->where('reservation_id', $reservation->id)
                            ->delete();
                        $reservation->delete();
                    });
                }
                $result->recordSuccess();
            } catch (\Throwable $e) {
                $result->recordFailure($key, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<int>  $ids
     */
    public function deleteCommissions(array $ids): BulkDeleteResult
    {
        $result = new BulkDeleteResult;

        foreach ($this->capIds($ids) as $id) {
            $commission = Commission::query()->find($id);
            if (! $commission) {
                $result->recordFailure($id, 'Commission not found.');

                continue;
            }

            try {
                DB::transaction(function () use ($commission): void {
                    CommissionRelease::query()->where('commission_id', $commission->id)->delete();
                    MarketerBookingCommissionEvent::query()->where('commission_id', $commission->id)->delete();
                    DB::table('marketer_payout_batch_items')->where('commission_id', $commission->id)->delete();
                    $commission->delete();
                });
                $result->recordSuccess();
            } catch (\Throwable $e) {
                $result->recordFailure($id, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<int>  $ids
     */
    public function deletePayoutBatches(array $ids): BulkDeleteResult
    {
        $result = new BulkDeleteResult;

        foreach ($this->capIds($ids) as $id) {
            $batch = MarketerPayoutBatch::query()->find($id);
            if (! $batch) {
                $result->recordFailure($id, 'Payout batch not found.');

                continue;
            }

            try {
                DB::transaction(function () use ($batch): void {
                    CommissionRelease::query()->where('payout_batch_id', $batch->id)->delete();
                    Commission::query()->where('payout_batch_id', $batch->id)->update(['payout_batch_id' => null]);
                    $batch->delete();
                });
                $result->recordSuccess();
            } catch (\Throwable $e) {
                $result->recordFailure($id, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    /**
     * @param  list<int>  $ids
     */
    public function deleteCommissionReleases(array $ids): BulkDeleteResult
    {
        $result = new BulkDeleteResult;

        foreach ($this->capIds($ids) as $id) {
            $release = CommissionRelease::query()->find($id);
            if (! $release) {
                $result->recordFailure($id, 'Release log not found.');

                continue;
            }

            try {
                $release->delete();
                $result->recordSuccess();
            } catch (\Throwable $e) {
                $result->recordFailure($id, FriendlyExceptionMessage::forBulkDelete($e));
            }
        }

        return $result;
    }

    public function assertAdmin(?User $auth): void
    {
        abort_unless($auth && $auth->role === 'admin', 403);
    }

    /**
     * @param  list<int>  $ids
     * @return list<int>
     */
    private function capIds(array $ids): array
    {
        $unique = [];
        foreach ($ids as $id) {
            $n = (int) $id;
            if ($n > 0) {
                $unique[$n] = $n;
            }
        }

        return array_slice(array_values($unique), 0, self::MAX_BATCH);
    }
}
