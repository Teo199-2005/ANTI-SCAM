<?php

namespace App\Modules\Users\Http\Requests;

use App\Models\User;
use App\Support\PlatformPasswordRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', User::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => PlatformPasswordRules::requiredWithConfirmation(),
            'role' => ['required', 'in:user,client,guest,admin,resort_owner,marketing,admin_staff'],
        ];
    }
}
