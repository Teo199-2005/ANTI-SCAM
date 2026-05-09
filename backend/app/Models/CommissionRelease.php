<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommissionRelease extends Model
{
    public const SOURCE_MANUAL = 'manual';

    public const SOURCE_XENDIT = 'xendit';

    protected $fillable = [
        'commission_id', 'released_by', 'amount', 'notes', 'released_at',
        'release_source', 'payout_batch_id',
    ];

    protected function casts(): array
    {
        return [
            'released_at' => 'datetime',
            'amount' => 'decimal:2',
        ];
    }

    public function commission(): BelongsTo
    {
        return $this->belongsTo(Commission::class);
    }

    public function releasedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }

    public function payoutBatch(): BelongsTo
    {
        return $this->belongsTo(MarketerPayoutBatch::class, 'payout_batch_id');
    }
}
