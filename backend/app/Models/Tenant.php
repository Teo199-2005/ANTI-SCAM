<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'subdomain',
        'status',
    ];

    public function resorts(): HasMany
    {
        return $this->hasMany(Resort::class);
    }
}
