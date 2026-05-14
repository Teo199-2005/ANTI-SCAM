<?php

namespace App\Modules\Resorts\Http\Resources;

use App\Services\PhilippineLocationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResortResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $loc = app(PhilippineLocationService::class);
        $isAdmin = $request->user()?->role === 'admin';

        $base = [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'name' => $this->name,
            'description' => $this->description,
            'address_province_psgc' => $this->address_province_psgc,
            'address_city_municipality_psgc' => $this->address_city_municipality_psgc,
            'address_barangay_psgc' => $this->address_barangay_psgc,
            'address_barangay_name' => $this->address_barangay_name,
            'address_street_line' => $this->address_street_line,
            'map_latitude' => $this->map_latitude !== null ? (float) $this->map_latitude : null,
            'map_longitude' => $this->map_longitude !== null ? (float) $this->map_longitude : null,
            'address_label' => $this->address_label,
            'address_display' => $loc->resortDisplayLine($this->resource),
            'address' => $loc->resortDisplayLine($this->resource),
            'contact_number' => $this->contact_number,
            'logo_url' => $this->logo_url,
            'background_image_url' => $this->background_image_url,
            'facebook_url' => $this->facebook_url,
            'instagram_url' => $this->instagram_url,
            'tiktok_url' => $this->tiktok_url,
            'representative_name' => $this->representative_name,
            'representative_contact_number' => $this->representative_contact_number,
            'cancellation_policy' => $this->cancellation_policy,
            'amenities' => $this->amenities ?? [],
            'is_publicly_listed' => (bool) $this->is_publicly_listed,
            'is_vip' => (bool) ($this->is_vip ?? false),
            'subdomain' => $this->whenLoaded('tenant', fn () => $this->tenant?->subdomain),
            'rooms_count' => $this->whenCounted('rooms'),
            'subscription' => $this->whenLoaded('subscription', function () {
                return [
                    'id' => $this->subscription?->id,
                    'plan' => $this->subscription?->plan,
                    'base_price' => $this->subscription?->base_price,
                    'included_rooms' => $this->subscription?->included_rooms,
                    'extra_room_fee' => $this->subscription?->extra_room_fee,
                    'active_room_count' => $this->subscription?->active_room_count,
                    'total_monthly_fee' => $this->subscription?->total_monthly_fee,
                    'billing_cycle_start' => $this->subscription?->billing_cycle_start?->toDateString(),
                    'billing_cycle_end' => $this->subscription?->billing_cycle_end?->toDateString(),
                    'next_due_date' => $this->subscription?->next_due_date?->toDateString(),
                    'grace_until' => $this->subscription?->grace_until?->toDateString(),
                    'status' => $this->subscription?->status,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

        if ($isAdmin) {
            $base['admin_landing_embed_enabled'] = (bool) ($this->admin_landing_embed_enabled ?? false);
            $base['admin_landing_youtube_url'] = $this->admin_landing_youtube_url;
        }

        return $base;
    }
}
