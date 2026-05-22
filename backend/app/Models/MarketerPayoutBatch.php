<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketerPayoutBatch extends Model
{
    public const STATUS_PENDING_SUBMIT = 'pending_submit';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_SUCCEEDED = 'succeeded';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'marketer_id', 'run_period', 'reference_id',
        'total_amount', 'gross_commissions_total', 'withholding_rate_applied',
        'currency',
        'status', 'xendit_payout_id', 'failure_message',
        'submitted_at', 'completed_at',
        'gcash_account_number_snapshot', 'gcash_last4_snapshot',
        'gcash_account_holder_name_snapshot',
        'marketer_name_snapshot', 'marketer_email_snapshot',
        'payout_channel_code_snapshot', 'bank_account_number_snapshot',
        'bank_account_last4_snapshot', 'bank_account_holder_name_snapshot',
        'bank_display_name_snapshot',
        'submit_attempts', 'last_attempt_at', 'last_attempt_error', 'last_attempt_error_code',
        'manually_aborted',
    ];

    protected $hidden = [
        'gcash_account_number_snapshot',
        'bank_account_number_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'gross_commissions_total' => 'decimal:2',
            'withholding_rate_applied' => 'float',
            'submitted_at' => 'datetime',
            'completed_at' => 'datetime',
            'last_attempt_at' => 'datetime',
            'submit_attempts' => 'integer',
            'manually_aborted' => 'boolean',
            'gcash_account_number_snapshot' => 'encrypted',
            'bank_account_number_snapshot' => 'encrypted',
        ];
    }

    public function usesBankDestination(): bool
    {
        return filled($this->payout_channel_code_snapshot) && filled($this->bank_account_number_snapshot);
    }

    public function usesLegacyGcashDestination(): bool
    {
        return ! $this->usesBankDestination() && filled($this->gcash_account_number_snapshot);
    }

    public function marketer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marketer_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MarketerPayoutBatchItem::class, 'batch_id');
    }

    /** Live (not-soft-cancelled) line items only. */
    public function liveItems(): HasMany
    {
        return $this->hasMany(MarketerPayoutBatchItem::class, 'batch_id')
            ->whereNull('cancelled_at');
    }
}
