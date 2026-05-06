<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountCode extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'resort_id', 'code', 'type', 'value',
        'max_uses', 'used_count', 'valid_from', 'valid_until', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active'   => 'boolean',
            'value'       => 'decimal:2',
            'valid_from'  => 'date',
            'valid_until' => 'date',
        ];
    }

    public function resort(): BelongsTo
    {
        return $this->belongsTo(Resort::class);
    }

    public function isValid(): bool
    {
        if (! $this->is_active) return false;
        if ($this->max_uses && $this->used_count >= $this->max_uses) return false;
        if ($this->valid_from && now()->lt($this->valid_from)) return false;
        if ($this->valid_until && now()->gt($this->valid_until->endOfDay())) return false;
        return true;
    }

    public function apply(float $amount): float
    {
        if ($this->type === 'percent') {
            return max(0, $amount - ($amount * ($this->value / 100)));
        }
        return max(0, $amount - $this->value);
    }
}
