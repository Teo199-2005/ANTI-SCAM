<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Resort extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'address_province_psgc',
        'address_city_municipality_psgc',
        'address_barangay_psgc',
        'address_barangay_name',
        'address_street_line',
        'map_latitude',
        'map_longitude',
        'address_label',
        'contact_number',
        'logo_url',
        'background_image_url',
        'facebook_url',
        'instagram_url',
        'tiktok_url',
        'representative_name',
        'representative_contact_number',
        'cancellation_policy',
        'amenities',
        'is_publicly_listed',
        'is_vip',
        'admin_landing_embed_enabled',
        'admin_landing_youtube_url',
        'hospitality_type',
        'hospitality_type_other',
        'website_url',
        'planned_room_count',
        'verification_status',
        'verification_method',
        'verification_submitted_at',
        'verified_at',
        'verification_rejection_reason',
        'verification_submission_count',
        'verification_assigned_to_user_id',
        'verification_admin_notes',
        'verification_scheduled_at',
        'verification_scheduled_notes',
    ];

    protected function casts(): array
    {
        return [
            'is_publicly_listed' => 'boolean',
            'is_vip' => 'boolean',
            'admin_landing_embed_enabled' => 'boolean',
            'amenities' => 'array',
            'planned_room_count' => 'integer',
            'verification_submitted_at' => 'datetime',
            'verified_at' => 'datetime',
            'verification_submission_count' => 'integer',
            'verification_scheduled_at' => 'datetime',
        ];
    }

    public function businessProfile(): HasOne
    {
        return $this->hasOne(ResortBusinessProfile::class);
    }

    public function verificationDocuments(): HasMany
    {
        return $this->hasMany(ResortVerificationDocument::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class);
    }

    public function subscriptionInvoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class);
    }

    public function landingPage(): HasOne
    {
        return $this->hasOne(ResortLandingPage::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ResortReview::class);
    }

    public function verificationAssignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verification_assigned_to_user_id');
    }

    public function isDiscoverableInPublicCatalog(): bool
    {
        return (bool) $this->is_publicly_listed;
    }

    /**
     * Resorts eligible for marketing catalog, slug pages, and public booking entry.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeDiscoverableInPublicCatalog(Builder $query): Builder
    {
        return $query->where('is_publicly_listed', true);
    }
}
