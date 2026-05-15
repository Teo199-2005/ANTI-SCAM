<?php

namespace App\Modules\Resorts\Http\Requests;

use App\Support\PlatformPasswordRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreResortGuestRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => PlatformPasswordRules::requiredWithConfirmation(),
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => mb_strtolower(trim((string) $this->input('email', ''))),
        ]);
    }
}
