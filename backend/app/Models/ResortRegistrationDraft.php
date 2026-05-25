<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResortRegistrationDraft extends Model
{
    protected $fillable = [
        'user_id',
        'current_step',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'current_step' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
