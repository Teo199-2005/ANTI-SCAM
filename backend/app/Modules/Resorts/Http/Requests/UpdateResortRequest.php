<?php

namespace App\Modules\Resorts\Http\Requests;

use App\Models\Resort;
use Illuminate\Foundation\Http\FormRequest;

class UpdateResortRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Resort $resort */
        $resort = $this->route('resort');
        return $this->user()?->can('update', $resort) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'address' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'logo_url' => ['nullable', 'url', 'max:2048'],
            'is_publicly_listed' => ['sometimes', 'boolean'],
        ];
    }
}
