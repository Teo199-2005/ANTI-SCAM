<?php

namespace App\Modules\Reservations\Http\Requests;

use App\Models\Reservation;
use Illuminate\Foundation\Http\FormRequest;

class CancelReservationByResortRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Reservation $reservation */
        $reservation = $this->route('reservation');

        return $this->user()?->can('cancelByResort', $reservation) ?? false;
    }

    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
