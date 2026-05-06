<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffNote extends Model
{
    protected $fillable = [
        'reservation_id', 'user_id', 'note', 'is_escalated',
    ];

    protected function casts(): array
    {
        return ['is_escalated' => 'boolean'];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
