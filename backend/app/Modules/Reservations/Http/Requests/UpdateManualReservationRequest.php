<?php

namespace App\Modules\Reservations\Http\Requests;

use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateManualReservationRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        /** @var Reservation $reservation */
        $reservation = $this->route('reservation');
        if (! $this->filled('check_in_date')) {
            $this->merge(['check_in_date' => $reservation->check_in_date->toDateString()]);
        }
        if (! $this->filled('check_out_date')) {
            $this->merge(['check_out_date' => $reservation->check_out_date->toDateString()]);
        }
    }

    public function authorize(): bool
    {
        /** @var Reservation $reservation */
        $reservation = $this->route('reservation');

        return $this->user()?->can('updateManual', $reservation) ?? false;
    }

    public function rules(): array
    {
        return [
            'room_id' => ['sometimes', 'integer', 'exists:rooms,id'],
            'check_in_date' => ['sometimes', 'date'],
            'check_out_date' => ['sometimes', 'date', 'after:check_in_date'],
            'guest_name' => ['sometimes', 'string', 'max:190'],
            'guest_email' => ['nullable', 'string', 'email', 'max:190'],
            'guest_phone' => ['nullable', 'string', 'max:30'],
            'guest_count' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'total_amount' => ['sometimes', 'numeric', 'min:0'],
            'reservation_fee' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $in = $this->input('check_in_date');
            $out = $this->input('check_out_date');
            if ($in && $out && strtotime((string) $out) <= strtotime((string) $in)) {
                $v->errors()->add('check_out_date', 'Check-out must be after check-in.');
            }

            if (! $this->filled('room_id')) {
                return;
            }
            /** @var Reservation $reservation */
            $reservation = $this->route('reservation');
            $user = $this->user();
            $roomId = (int) $this->input('room_id');
            $room = Room::withoutGlobalScopes()->where('id', $roomId)->where('tenant_id', $user->tenant_id)->first();
            if (! $room || (int) $room->resort_id !== (int) $reservation->resort_id) {
                $v->errors()->add('room_id', 'Room is invalid for this resort.');
            }
        });
    }
}
