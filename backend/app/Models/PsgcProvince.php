<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PsgcProvince extends Model
{
    protected $table = 'psgc_provinces';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $primaryKey = 'code';

    protected $fillable = [
        'code',
        'name',
    ];

    public function citiesMunicipalities(): HasMany
    {
        return $this->hasMany(PsgcCityMunicipality::class, 'province_code', 'code');
    }
}
