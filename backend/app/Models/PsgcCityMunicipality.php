<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PsgcCityMunicipality extends Model
{
    protected $table = 'psgc_cities_municipalities';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $primaryKey = 'code';

    protected $fillable = [
        'code',
        'province_code',
        'name',
    ];

    public function province(): BelongsTo
    {
        return $this->belongsTo(PsgcProvince::class, 'province_code', 'code');
    }

    public function barangays(): HasMany
    {
        return $this->hasMany(PsgcBarangay::class, 'city_municipality_code', 'code');
    }
}
