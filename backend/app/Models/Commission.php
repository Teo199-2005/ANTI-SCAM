<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Commission extends Model
{
    protected $fillable = [
        'marketer_id', 'resort_id', 'period',
        'gross_bookings', 'booking_count', 'commission_rate', 'marketer_tier', 'unit_commission_php', 'commission_amount', 'status', 'payout_batch_id',
    ];

    protected function casts(): array
    {
        return [
            'gross_bookings' => 'decimal:2',
            'booking_count' => 'integer',
            'commission_rate' => 'float',
            'unit_commission_php' => 'decimal:2',
            'commission_amount' => 'decimal:2',
        ];
    }

    public function marketer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marketer_id');
    }

    public function resort(): BelongsTo
    {
        return $this->belongsTo(Resort::class);
    }

    public function releases(): HasMany
    {
        return $this->hasMany(CommissionRelease::class);
    }

    public function payoutBatch(): BelongsTo
    {
        return $this->belongsTo(MarketerPayoutBatch::class, 'payout_batch_id');
    }
}
