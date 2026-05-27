<?php

namespace App\Modules\Rooms\Http\Requests;

use App\Models\Room;
use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Room $room */
        $room = $this->route('room');
        return $this->user()?->can('update', $room) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:40'],
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'units' => ['sometimes', 'integer', 'min:1', 'max:99'],
            'base_price' => ['sometimes', 'numeric', 'min:0'],
            'weekday_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'weekend_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'amenities' => ['nullable', 'array'],
            'amenities.*' => ['string', 'max:80'],
            'rules' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:active,inactive,maintenance'],
        ];
    }
}
