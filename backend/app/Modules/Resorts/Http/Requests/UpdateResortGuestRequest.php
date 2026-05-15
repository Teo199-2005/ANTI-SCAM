<?php

namespace App\Modules\Resorts\Http\Requests;

use App\Support\PlatformPasswordRules;
use Illuminate\Foundation\Http\FormRequest;

class UpdateResortGuestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['resort_owner', 'admin_staff', 'admin'], true);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email:rfc', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => PlatformPasswordRules::optionalWithConfirmation(),
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge([
                'email' => mb_strtolower(trim((string) $this->input('email', ''))),
            ]);
        }
    }
}
