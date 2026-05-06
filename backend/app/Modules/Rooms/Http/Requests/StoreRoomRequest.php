<?php

namespace App\Modules\Rooms\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Room::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'resort_id' => ['required', 'exists:resorts,id'],
            'name' => ['required', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:40'],
            'capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'amenities' => ['nullable', 'array'],
            'amenities.*' => ['string', 'max:80'],
            'rules' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive,maintenance'],
        ];
    }
}
