<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomDailyRate extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'room_id',
        'date',
        'nightly_price',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'nightly_price' => 'decimal:2',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
