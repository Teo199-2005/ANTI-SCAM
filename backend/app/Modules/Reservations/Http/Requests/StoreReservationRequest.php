<?php

namespace App\Modules\Reservations\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'resort_id' => ['required', 'integer', 'exists:resorts,id'],
            'lock_token' => ['required', 'string'],
            'guest_count' => ['nullable', 'integer', 'min:1'],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
