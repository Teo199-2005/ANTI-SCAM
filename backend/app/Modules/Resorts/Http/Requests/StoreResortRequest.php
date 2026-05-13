<?php

namespace App\Modules\Resorts\Http\Requests;

use App\Models\Resort;
use App\Services\PhilippineLocationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreResortRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        foreach (['address_province_psgc', 'address_city_municipality_psgc', 'address_barangay_psgc', 'address_barangay_name'] as $key) {
            if (! $this->has($key)) {
                continue;
            }
            $raw = $this->input($key);
            if (! is_string($raw)) {
                continue;
            }
            $trimmed = trim($raw);
            $this->merge([$key => $trimmed === '' ? null : $trimmed]);
        }
    }

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
            'address_province_psgc' => ['nullable', 'string', 'max:12'],
            'address_city_municipality_psgc' => ['nullable', 'string', 'max:12'],
            'address_barangay_psgc' => ['nullable', 'string', 'max:12'],
            'address_barangay_name' => ['nullable', 'string', 'max:180'],
            'address_label' => ['nullable', 'string', 'max:512'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'logo_url' => ['nullable', 'string', 'max:2048'],
            'background_image_url' => ['nullable', 'string', 'max:2048'],
            'is_publicly_listed' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            app(PhilippineLocationService::class)->assertValidPhilippineLocationOrEmpty(
                $this->input('address_province_psgc'),
                $this->input('address_city_municipality_psgc'),
                $this->input('address_barangay_name'),
                $this->input('address_barangay_psgc'),
            );
        });
    }
}
