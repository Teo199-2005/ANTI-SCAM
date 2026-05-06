<?php

namespace App\Modules\Resorts\Http\Requests;

use App\Models\Resort;
use Illuminate\Foundation\Http\FormRequest;

class StoreResortRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Resort::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'tenant_id' => ['nullable', 'exists:tenants,id'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'address' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'logo_url' => ['nullable', 'url', 'max:2048'],
            'is_publicly_listed' => ['nullable', 'boolean'],
        ];
    }
}
