<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketerPayoutBatchItem extends Model
{
    protected $fillable = [
        'batch_id', 'commission_id', 'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
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
