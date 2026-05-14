<?php

namespace App\Modules\Reservations\Http\Requests;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreManualReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('createManual', Reservation::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'resort_id' => ['required', 'integer', 'exists:resorts,id'],
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'check_in_date' => ['required', 'date'],
            'check_out_date' => ['required', 'date', 'after:check_in_date'],
            'guest_name' => ['required', 'string', 'max:190'],
            'guest_email' => ['nullable', 'string', 'email', 'max:190'],
            'guest_phone' => ['nullable', 'string', 'max:30'],
            'guest_count' => ['required', 'integer', 'min:1', 'max:500'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'reservation_fee' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $user = $this->user();
            if (! $user) {
                return;
            }
            $tenantId = (int) $user->tenant_id;
            $resortId = (int) $this->input('resort_id');
            $roomId = (int) $this->input('room_id');

            $resort = Resort::withoutGlobalScopes()->where('id', $resortId)->where('tenant_id', $tenantId)->first();
            if (! $resort) {
                $v->errors()->add('resort_id', 'Resort is invalid for your account.');
            }

            $room = Room::withoutGlobalScopes()->where('id', $roomId)->where('tenant_id', $tenantId)->first();
            if (! $room || (int) $room->resort_id !== $resortId) {
                $v->errors()->add('room_id', 'Room is invalid for this resort.');
            }
        });
    }
}
