<?php

namespace App\Modules\Rooms\Http\Requests;

use App\Models\Room;
use Illuminate\Foundation\Http\FormRequest;

class StoreRoomAvailabilityRequest extends FormRequest
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
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'status' => ['required', 'in:available,blocked,maintenance'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
