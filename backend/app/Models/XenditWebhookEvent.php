<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class XenditWebhookEvent extends Model
{
    protected $fillable = [
        'event_id',
        'event_type',
        'invoice_id',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'processed_at' => 'datetime',
        ];
    }
}
