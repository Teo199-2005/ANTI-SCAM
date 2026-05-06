<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PolicyAcknowledgment extends Model
{
    protected $fillable = [
        'user_id', 'reservation_id', 'policy_version', 'snapshot', 'acknowledged_at', 'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'snapshot'         => 'array',
            'acknowledged_at'  => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }
}
