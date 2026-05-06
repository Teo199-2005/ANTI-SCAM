<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailLog extends Model
{
    protected $fillable = [
        'tenant_id', 'type', 'to_email', 'subject', 'status', 'error', 'metadata', 'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'sent_at'  => 'datetime',
        ];
    }
}
