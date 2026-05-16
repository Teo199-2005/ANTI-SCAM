<?php

namespace App\Modules\Rooms\Http\Requests;

use App\Models\Room;
use Illuminate\Foundation\Http\FormRequest;

class UpsertRoomDailyRatesRequest extends FormRequest
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
            'dates' => ['required', 'array', 'min:1', 'max:62'],
            'dates.*' => ['required', 'date'],
            'nightly_price' => ['required', 'numeric', 'min:0'],
        ];
    }
}
