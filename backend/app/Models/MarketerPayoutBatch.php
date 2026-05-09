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
        'marketer_id', 'run_period', 'reference_id', 'total_amount', 'currency',
        'status', 'xendit_payout_id', 'failure_message', 'submitted_at', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'submitted_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function marketer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marketer_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MarketerPayoutBatchItem::class, 'batch_id');
    }
}
