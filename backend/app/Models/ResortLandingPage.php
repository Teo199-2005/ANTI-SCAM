<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResortLandingPage extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'resort_id',
        'tenant_id',
        'section1_heading',
        'section1_subheading',
        'section1_bg_image_url',
        'section1_cta_label',
        'section1_cta_url',
        'section2_heading',
        'section2_body',
        'section2_gallery',
        'section2_cta_label',
        'section2_cta_url',
    ];

    protected function casts(): array
    {
        return [
            'section2_gallery' => 'array',
        ];
    }

    public function resort(): BelongsTo
    {
        return $this->belongsTo(Resort::class);
    }
}
