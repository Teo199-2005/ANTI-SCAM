<?php

namespace App\Modules\Reservations\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminOverrideReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) ($this->user()?->can('adminOverride', \App\Models\Reservation::class));
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'in:pending_payment,confirmed,cancelled,expired'],
            'reason' => ['required', 'string', 'min:8'],
        ];
    }
}
