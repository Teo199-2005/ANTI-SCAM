<?php

namespace App\Modules\Users\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                             => $this->id,
            'name'                           => $this->name,
            'email'                          => $this->email,
            'role'                           => $this->role,
            'phone'                          => $this->phone,
            'mailing_province_psgc'          => $this->mailing_province_psgc,
            'mailing_city_municipality_psgc' => $this->mailing_city_municipality_psgc,
            'mailing_barangay_name'          => $this->mailing_barangay_name,
            'mailing_location_label'         => $this->mailing_location_label,
            'booking_commission_php'           => $this->role === 'marketing' && $this->booking_commission_php !== null
                ? round((float) $this->booking_commission_php, 2)
                : null,
            'createdAt'                      => $this->created_at?->toISOString(),
            'created_at'                     => $this->created_at?->toISOString(),
        ];
    }
}
