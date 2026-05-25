<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResortBusinessProfile extends Model
{
    protected $fillable = [
        'resort_id',
        'business_status',
        'business_name',
        'business_address',
        'business_contact_number',
        'business_tin',
        'sec_dti_number',
    ];

    public function resort(): BelongsTo
    {
        return $this->belongsTo(Resort::class);
    }
}
