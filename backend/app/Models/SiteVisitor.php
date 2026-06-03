<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class SiteVisitor extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'session_id',
        'ip_address',
        'user_agent',
        'page_url',
        'referrer_url',
        'resort_id',
        'is_unique',
        'visited_at',
    ];

    protected $casts = [
        'is_unique' => 'boolean',
        'visited_at' => 'datetime',
    ];

    public function resort(): BelongsTo
    {
        return $this->belongsTo(Resort::class);
    }
}
