<?php

namespace App\Modules\Rooms\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'resort_id' => $this->resort_id,
            'name' => $this->name,
            'code' => $this->code,
            'capacity' => $this->capacity,
            'units' => (int) ($this->units ?? 1),
            'base_price' => $this->base_price,
            'weekday_price' => $this->weekday_price,
            'weekend_price' => $this->weekend_price,
            'amenities' => $this->amenities ?? [],
            'rules' => $this->rules,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
