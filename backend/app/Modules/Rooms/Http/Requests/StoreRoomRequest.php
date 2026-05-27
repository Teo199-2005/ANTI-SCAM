<?php

namespace App\Modules\Rooms\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Room::class) ?? false;
    }

    public function rules(): array
    {
        $user = $this->user();
        $resortRule = Rule::exists('resorts', 'id');
        if ($user && $user->role !== 'admin') {
            $resortRule = $resortRule->where(fn ($query) => $query->where('tenant_id', $user->tenant_id));
        }

        return [
            'resort_id' => ['required', 'integer', $resortRule],
            'name' => ['required', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:40'],
            'capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'units' => ['sometimes', 'integer', 'min:1', 'max:99'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'weekday_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'weekend_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'amenities' => ['nullable', 'array'],
            'amenities.*' => ['string', 'max:80'],
            'rules' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive,maintenance'],
        ];
    }
}
