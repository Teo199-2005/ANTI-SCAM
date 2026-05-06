<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommissionRelease extends Model
{
    protected $fillable = [
        'commission_id', 'released_by', 'amount', 'notes', 'released_at',
    ];

    protected function casts(): array
    {
        return [
            'released_at' => 'datetime',
            'amount'      => 'decimal:2',
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
}
