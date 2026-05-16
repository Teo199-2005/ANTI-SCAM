<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'resort_id',
        'name',
        'code',
        'capacity',
        'units',
        'base_price',
        'amenities',
        'rules',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'amenities' => 'array',
            'units' => 'integer',
        ];
    }

    public function resort(): BelongsTo
    {
        return $this->belongsTo(Resort::class);
    }

    public function availability(): HasMany
    {
        return $this->hasMany(RoomAvailability::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(RoomImage::class)->orderBy('sort_order');
    }

    public function dailyRates(): HasMany
    {
        return $this->hasMany(RoomDailyRate::class);
    }
}
