<?php

namespace App\Modules\Resorts\Http\Requests;

use App\Models\Resort;
use App\Services\PhilippineLocationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateResortRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        foreach (['address_province_psgc', 'address_city_municipality_psgc', 'address_barangay_psgc', 'address_barangay_name', 'address_street_line'] as $key) {
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

        foreach (['facebook_url', 'instagram_url', 'tiktok_url'] as $key) {
            if (! $this->has($key)) {
                continue;
            }
            $raw = $this->input($key);
            if (! is_string($raw)) {
                continue;
            }
            $trimmed = trim($raw);
            if ($trimmed === '') {
                $this->merge([$key => null]);

                continue;
            }
            if (! preg_match('#^https?://#i', $trimmed)) {
                $trimmed = 'https://'.ltrim($trimmed, '/');
            }
            $this->merge([$key => $trimmed]);
        }
    }

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
            'address_province_psgc' => ['nullable', 'string', 'max:12'],
            'address_city_municipality_psgc' => ['nullable', 'string', 'max:12'],
            'address_barangay_psgc' => ['nullable', 'string', 'max:12'],
            'address_barangay_name' => ['nullable', 'string', 'max:180'],
            'address_street_line' => ['nullable', 'string', 'max:255'],
            'map_latitude' => ['nullable', 'numeric', 'between:4.2,21.3'],
            'map_longitude' => ['nullable', 'numeric', 'between:116.4,127.2'],
            'address_label' => ['nullable', 'string', 'max:512'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'logo_url' => ['nullable', 'string', 'max:2048'],
            'background_image_url' => ['nullable', 'string', 'max:2048'],
            'facebook_url' => ['nullable', 'string', 'max:2048', 'url'],
            'instagram_url' => ['nullable', 'string', 'max:2048', 'url'],
            'tiktok_url' => ['nullable', 'string', 'max:2048', 'url'],
            'representative_name' => ['nullable', 'string', 'max:190'],
            'representative_contact_number' => ['nullable', 'string', 'max:30'],
            'is_publicly_listed' => ['sometimes', 'boolean'],
            'cancellation_policy' => ['nullable', 'string'],
            'amenities' => ['nullable', 'array'],
            'amenities.*' => ['string', 'max:120'],
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

            $lat = $this->input('map_latitude');
            $lng = $this->input('map_longitude');
            $latEmpty = $lat === null || $lat === '';
            $lngEmpty = $lng === null || $lng === '';
            if ($latEmpty xor $lngEmpty) {
                $v->errors()->add('map_latitude', 'Provide both latitude and longitude, or clear both.');
            }

            if ($this->user()?->role === 'resort_owner' && $this->has('name')) {
                /** @var Resort $resort */
                $resort = $this->route('resort');
                $incoming = trim((string) $this->input('name'));
                if ($incoming !== '' && $incoming !== (string) $resort->name) {
                    $v->errors()->add(
                        'name',
                        'Resort name cannot be changed after registration. Contact support if you need help.',
                    );
                }
            }
        });
    }

    /**
     * Resort owners may update profile fields but not rename the property (1 resort · 1 account · 1 email).
     *
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): mixed
    {
        $validated = parent::validated($key, $default);

        if ($key !== null) {
            return $validated;
        }

        if ($this->user()?->role === 'resort_owner') {
            unset($validated['name']);
        }

        return $validated;
    }
}
