<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsgcBarangay extends Model
{
    protected $table = 'psgc_barangays';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $primaryKey = 'code';

    protected $fillable = [
        'code',
        'city_municipality_code',
        'name',
    ];

    public function cityMunicipality(): BelongsTo
    {
        return $this->belongsTo(PsgcCityMunicipality::class, 'city_municipality_code', 'code');
    }
}
