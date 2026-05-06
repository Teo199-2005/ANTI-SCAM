<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class BookingLock extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'room_id',
        'lock_token',
        'check_in_date',
        'check_out_date',
        'expires_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'check_in_date' => 'date',
            'check_out_date' => 'date',
            'expires_at' => 'datetime',
        ];
    }
}
