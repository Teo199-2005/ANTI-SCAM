<?php

namespace App\Modules\Users\Http\Requests;

use App\Support\PlatformPasswordRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('user')) ?? false;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'name'                          => ['sometimes', 'string', 'max:120'],
            'email'                         => ['sometimes', 'email', 'max:190', Rule::unique('users', 'email')->ignore($userId)],
            'password'                      => PlatformPasswordRules::optionalWithConfirmation(),
            'role'                          => ['sometimes', 'in:user,client,guest,admin,resort_owner,marketing,admin_staff'],
            'phone'                         => ['sometimes', 'nullable', 'string', 'max:30'],
            'mailing_province_psgc'         => ['sometimes', 'nullable', 'string', 'max:20'],
            'mailing_city_municipality_psgc'=> ['sometimes', 'nullable', 'string', 'max:20'],
            'mailing_barangay_name'         => ['sometimes', 'nullable', 'string', 'max:180'],
            'mailing_location_label'        => ['sometimes', 'nullable', 'string', 'max:300'],
            'booking_commission_php'      => ['sometimes', 'nullable', 'numeric', 'min:1', 'max:5000'],
        ];
    }
}
