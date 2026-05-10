<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketerPayoutBatchItem extends Model
{
    protected $fillable = [
        'batch_id', 'commission_id', 'amount',
        'gross_commission_snapshot', 'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'gross_commission_snapshot' => 'decimal:2',
            'cancelled_at' => 'datetime',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(MarketerPayoutBatch::class, 'batch_id');
    }

    public function commission(): BelongsTo
    {
        return $this->belongsTo(Commission::class);
    }
}
