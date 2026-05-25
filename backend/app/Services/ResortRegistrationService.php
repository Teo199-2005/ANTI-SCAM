<?php

declare(strict_types=1);

namespace App\Services;

use App\Legal\PlatformTerms;
use App\Models\Resort;
use App\Models\ResortBusinessProfile;
use App\Models\ResortRegistrationDraft;
use App\Models\ResortVerificationDocument;
use App\Models\Room;
use App\Models\RoomImage;
use App\Models\User;
use App\Support\PlatformPasswordRules;
use App\Support\ResortRegistrationCatalog;
use App\Support\TenantPublicIdentifier;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class ResortRegistrationService
{
    public function __construct(
        private readonly PhilippineLocationService $locations,
        private readonly ResortOwnerOnboardingService $ownerOnboarding,
        private readonly ReferralSignupTrialService $referralSignupTrial,
        private readonly ResortVerificationNotificationService $verificationNotifications,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function registrationStateForUser(User $user): array
    {
        $user = $user->fresh() ?? $user;
        $draft = $this->draftFor($user);
        $resort = $this->ownerResort($user);
        $payload = $draft?->payload ?? [];

        return [
            'registration_status' => $this->registrationStatus($user),
            'onboarding_step' => max(1, min(6, (int) ($user->onboarding_step ?? $draft?->current_step ?? 1))),
            'verification_status' => $resort?->verification_status ?? 'pending',
            'draft' => [
                'current_step' => $draft?->current_step ?? 1,
                'payload' => $payload,
                'updated_at' => $draft?->updated_at?->toIso8601String(),
            ],
            'user' => $this->userStepSnapshot($user),
            'resort_id' => $resort?->id,
            'catalog' => [
                'hospitality_types' => ResortRegistrationCatalog::hospitalityTypes(),
                'amenity_groups' => ResortRegistrationCatalog::amenityGroups(),
                'verification_methods' => ResortRegistrationCatalog::verificationMethods(),
            ],
        ];
    }

    public function ensureDraftForOwner(User $user, array $seedPayload = []): ResortRegistrationDraft
    {
        return ResortRegistrationDraft::firstOrCreate(
            ['user_id' => $user->id],
            [
                'current_step' => 1,
                'payload' => $seedPayload,
            ],
        );
    }

    public function registrationStatus(User $user): string
    {
        if ($user->role !== 'resort_owner') {
            return 'complete';
        }

        if ($user->registration_completed_at !== null && $user->tenant_id !== null && $this->ownerResort($user) !== null) {
            return 'complete';
        }

        return 'incomplete';
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function saveStep(User $user, int $step, array $data, bool $draftSave = false): array
    {
        if ($user->role !== 'resort_owner') {
            throw ValidationException::withMessages(['role' => ['Only resort owners can complete property registration.']]);
        }

        if ($user->registration_completed_at !== null && $step < 6) {
            throw ValidationException::withMessages(['registration' => ['Registration is already complete.']]);
        }

        $draft = $this->draftFor($user) ?? ResortRegistrationDraft::create([
            'user_id' => $user->id,
            'current_step' => 1,
            'payload' => [],
        ]);

        match ($step) {
            1 => $this->applyStep1($user, $data),
            2 => $this->mergeDraftStep($draft, 2, $this->validateStep2($data, $draftSave)),
            3 => $this->mergeDraftStep($draft, 3, $this->validateStep3($data, $draftSave)),
            4 => $this->mergeDraftStep($draft, 4, $this->validateStep4($data, $draftSave)),
            5 => $this->mergeDraftStep($draft, 5, $this->validateStep5($data, $draftSave)),
            6 => $this->applyStep6($user, $data),
            default => throw ValidationException::withMessages(['step' => ['Invalid registration step.']]),
        };

        $nextStep = min(6, max($step, (int) $draft->fresh()->current_step));
        $user->forceFill(['onboarding_step' => $nextStep])->save();

        return $this->registrationStateForUser($user->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function finishRegistration(User $user): array
    {
        $user = $user->fresh() ?? $user;
        if ($this->ownerResort($user) !== null) {
            return $this->registrationStateForUser($user);
        }

        $draft = $this->draftFor($user);
        if ($draft === null) {
            throw ValidationException::withMessages(['registration' => ['Complete earlier steps before finishing.']]);
        }

        $payload = $draft->payload ?? [];
        $this->validateFinishPayload($payload);

        DB::transaction(function () use ($user, $payload): void {
            $locked = User::withoutGlobalScopes()->whereKey($user->id)->lockForUpdate()->first();
            if (! $locked || $this->ownerResort($locked) !== null) {
                return;
            }

            $step1 = $payload['step1'] ?? [];
            $step2 = $payload['step2'] ?? [];
            $step3 = $payload['step3'] ?? [];
            $step4 = $payload['step4'] ?? [];
            $step5 = $payload['step5'] ?? [];

            $businessName = trim((string) ($step2['business_name'] ?? ''));
            $defaults = $this->ownerOnboarding->defaultNamesFromOwner($locked, $businessName !== '' ? $businessName : null);

            $onboardInput = [
                'business_name' => $businessName !== '' ? $businessName : null,
                'resort_name' => trim((string) ($step3['property_name'] ?? $defaults['resort_name'])),
                'tenant_name' => $defaults['tenant_name'],
                'description' => $step3['description'] ?? null,
                'contact_number' => $step1['contact_number'] ?? $locked->phone,
                'representative_name' => $step1['name'] ?? $locked->name,
                'representative_contact_number' => $step1['contact_number'] ?? $locked->phone,
                'hospitality_type' => $step3['hospitality_type'] ?? null,
                'facebook_url' => $step3['facebook_url'] ?? null,
                'instagram_url' => $step3['instagram_url'] ?? null,
                'tiktok_url' => $step3['tiktok_url'] ?? null,
                'website_url' => $step3['website_url'] ?? null,
                'logo_url' => $step4['logo_url'] ?? null,
                'amenities' => $this->flattenAmenities($step4['amenities'] ?? [], (bool) ($step4['parking_enabled'] ?? false)),
                'is_publicly_listed' => false,
                'address_province_psgc' => $step3['address_province_psgc'] ?? null,
                'address_city_municipality_psgc' => $step3['address_city_municipality_psgc'] ?? null,
                'address_barangay_psgc' => $step3['address_barangay_psgc'] ?? null,
                'address_barangay_name' => $step3['address_barangay_name'] ?? null,
                'address_street_line' => $step3['address_street_line'] ?? null,
                'map_latitude' => $step3['map_latitude'] ?? null,
                'map_longitude' => $step3['map_longitude'] ?? null,
                'address_label' => $step3['address_label'] ?? null,
            ];

            if ($locked->tenant_id === null) {
                $result = $this->ownerOnboarding->onboardOwner($locked, $onboardInput);
                $resort = $result['resort'];
                $locked = $result['owner'];
            } else {
                $resort = $this->ownerResort($locked) ?? throw ValidationException::withMessages(['resort' => ['Resort workspace missing.']]);
                $resort->update($this->resortAttributesFromOnboardInput($onboardInput));
                $this->locations->syncResortAddressLabel($resort);
            }

            $resort->forceFill([
                'hospitality_type' => $step3['hospitality_type'] ?? null,
                'hospitality_type_other' => $step3['hospitality_type_other'] ?? null,
                'planned_room_count' => isset($step3['planned_room_count']) ? (int) $step3['planned_room_count'] : null,
                'verification_status' => 'pending',
                'is_publicly_listed' => false,
            ])->save();

            $this->syncBusinessProfile($resort, $step2);
            $this->syncRoomsFromDraft($resort, $step4, $step5);

            $referralCode = trim((string) ($step2['referral_code'] ?? ''));
            if ($referralCode !== '' && $locked->signup_referral_code === null) {
                $this->referralSignupTrial->redeemAtRegistration($locked, $referralCode, $businessName !== '' ? $businessName : null);
            }

            $locked->forceFill([
                'registration_completed_at' => now(),
                'onboarding_step' => 6,
            ])->save();
        });

        return $this->registrationStateForUser($user->fresh());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function storeVerificationDocument(User $user, string $documentType, UploadedFile $file): ResortVerificationDocument
    {
        if (! in_array($documentType, ResortRegistrationCatalog::verificationDocumentTypes(), true)) {
            throw ValidationException::withMessages(['document_type' => ['Invalid document type.']]);
        }

        $resort = $this->ownerResort($user);
        if ($resort === null) {
            throw ValidationException::withMessages([
                'registration' => ['Finish registration (pricing step) before uploading verification documents.'],
                'resort' => ['Your resort workspace is not set up yet. Complete registration first.'],
            ]);
        }

        $path = $file->store("resort-verification/{$resort->id}", 'public');

        return ResortVerificationDocument::updateOrCreate(
            ['resort_id' => $resort->id, 'document_type' => $documentType],
            [
                'disk' => 'public',
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'uploaded_at' => now(),
            ],
        );
    }

    public function storeDraftLogo(User $user, UploadedFile $file): string
    {
        $path = $file->store("registration-drafts/{$user->id}", 'public');
        $url = Storage::disk('public')->url($path);

        $draft = $this->draftFor($user) ?? ResortRegistrationDraft::create([
            'user_id' => $user->id,
            'current_step' => 4,
            'payload' => [],
        ]);
        $payload = $draft->payload ?? [];
        $step4 = is_array($payload['step4'] ?? null) ? $payload['step4'] : [];
        $step4['logo_url'] = $url;
        $payload['step4'] = $step4;
        $draft->update(['payload' => $payload, 'current_step' => max(4, (int) $draft->current_step)]);

        return $url;
    }

    private function draftFor(User $user): ?ResortRegistrationDraft
    {
        return ResortRegistrationDraft::query()->where('user_id', $user->id)->first();
    }

    private function ownerResort(User $user): ?Resort
    {
        if ($user->tenant_id === null) {
            return null;
        }

        return Resort::withoutGlobalScopes()->where('tenant_id', $user->tenant_id)->first();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function applyStep1(User $user, array $data): void
    {
        $validated = validator($data, [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'contact_number' => ['required', 'string', 'max:30'],
            'birth_date' => ['required', 'date', 'before:-18 years'],
            'personal_tin' => ['nullable', 'string', 'max:32'],
            'owner_mailing_province_psgc' => ['nullable', 'string', 'max:20'],
            'owner_mailing_city_municipality_psgc' => ['nullable', 'string', 'max:20'],
            'owner_mailing_barangay_psgc' => ['nullable', 'string', 'max:20'],
            'owner_mailing_barangay_name' => ['nullable', 'string', 'max:120'],
            'owner_mailing_street_line' => ['required', 'string', 'max:255'],
            'owner_mailing_location_label' => ['nullable', 'string', 'max:500'],
            'password' => PlatformPasswordRules::optionalWithConfirmation(),
            'accept_terms' => ['sometimes', 'accepted'],
            'accept_privacy' => ['sometimes', 'accepted'],
            'accept_information_certification' => ['required', 'accepted'],
        ])->validate();

        if (mb_strtolower($validated['email']) !== mb_strtolower($user->email)) {
            $exists = User::query()->where('email', mb_strtolower($validated['email']))->where('id', '!=', $user->id)->exists();
            if ($exists) {
                throw ValidationException::withMessages(['email' => ['This email is already registered.']]);
            }
        }

        $this->locations->assertValidPhilippineLocationOrEmpty(
            $validated['owner_mailing_province_psgc'] ?? null,
            $validated['owner_mailing_city_municipality_psgc'] ?? null,
            $validated['owner_mailing_barangay_name'] ?? null,
            $validated['owner_mailing_barangay_psgc'] ?? null,
        );

        $update = [
            'name' => $validated['name'],
            'email' => mb_strtolower($validated['email']),
            'phone' => $validated['contact_number'],
            'birth_date' => $validated['birth_date'],
            'personal_tin' => $validated['personal_tin'] ?? null,
            'owner_mailing_province_psgc' => $validated['owner_mailing_province_psgc'] ?? null,
            'owner_mailing_city_municipality_psgc' => $validated['owner_mailing_city_municipality_psgc'] ?? null,
            'owner_mailing_barangay_psgc' => $validated['owner_mailing_barangay_psgc'] ?? null,
            'owner_mailing_barangay_name' => $validated['owner_mailing_barangay_name'] ?? null,
            'owner_mailing_street_line' => $validated['owner_mailing_street_line'],
            'owner_mailing_location_label' => $validated['owner_mailing_location_label'] ?? null,
            'information_certified_at' => now(),
        ];

        if (! empty($validated['password'])) {
            $update['password'] = Hash::make($validated['password']);
        }

        if (! empty($validated['accept_terms'])) {
            $update['terms_accepted_at'] = $user->terms_accepted_at ?? now();
            $update['terms_version'] = $user->terms_version ?? PlatformTerms::version();
        }

        $user->update($update);

        $draft = $this->draftFor($user) ?? ResortRegistrationDraft::create([
            'user_id' => $user->id,
            'current_step' => 1,
            'payload' => [],
        ]);
        $payload = $draft->payload ?? [];
        $payload['step1'] = $validated;
        $draft->update(['payload' => $payload, 'current_step' => max(2, (int) $draft->current_step)]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function validateStep2(array $data, bool $draftSave = false): array
    {
        $unregistered = (bool) ($data['no_registered_business'] ?? false);
        $required = $draftSave ? 'nullable' : 'required';

        $rules = [
            'no_registered_business' => ['boolean'],
            'referral_code' => ['nullable', 'string', 'max:32'],
        ];

        if (! $unregistered) {
            $rules += [
                'business_name' => [$required, 'string', 'max:190'],
                'business_address' => [$required, 'string', 'max:500'],
                'business_contact_number' => [$required, 'string', 'max:30'],
                'business_tin' => ['nullable', 'string', 'max:32'],
                'sec_dti_number' => ['nullable', 'string', 'max:64'],
            ];
        }

        $validated = validator($data, $rules)->validate();
        $validated['business_status'] = $unregistered ? 'unregistered' : 'registered';

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function validateStep3(array $data, bool $draftSave = false): array
    {
        $required = $draftSave ? 'nullable' : 'required';

        $validated = validator($data, [
            'property_name' => [$required, 'string', 'max:190'],
            'hospitality_type' => [$required, Rule::in(ResortRegistrationCatalog::hospitalityTypes())],
            'hospitality_type_other' => ['required_if:hospitality_type,other', 'nullable', 'string', 'max:120'],
            'planned_room_count' => [$required, 'integer', 'min:1', 'max:500'],
            'description' => ['nullable', 'string', 'max:5000'],
            'facebook_url' => ['nullable', 'url', 'max:500'],
            'tiktok_url' => ['nullable', 'url', 'max:500'],
            'instagram_url' => ['nullable', 'url', 'max:500'],
            'website_url' => ['nullable', 'url', 'max:500'],
            'address_province_psgc' => [$required, 'string', 'max:20'],
            'address_city_municipality_psgc' => [$required, 'string', 'max:20'],
            'address_barangay_name' => [$required, 'string', 'max:120'],
            'address_barangay_psgc' => ['nullable', 'string', 'max:20'],
            'address_street_line' => [$required, 'string', 'max:255'],
            'map_latitude' => ['nullable', 'numeric'],
            'map_longitude' => ['nullable', 'numeric'],
            'address_label' => ['nullable', 'string', 'max:500'],
        ])->validate();

        if (! $draftSave) {
            $this->locations->assertValidPhilippineLocationOrEmpty(
                $validated['address_province_psgc'] ?? null,
                $validated['address_city_municipality_psgc'] ?? null,
                $validated['address_barangay_name'] ?? null,
                $validated['address_barangay_psgc'] ?? null,
            );
        }

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function validateStep4(array $data, bool $draftSave = false): array
    {
        $required = $draftSave ? 'nullable' : 'required';

        $validated = validator($data, [
            'logo_url' => ['nullable', 'string', 'max:500'],
            'amenities' => ['nullable', 'array'],
            'parking_enabled' => ['boolean'],
            'parking_slots' => ['nullable', 'integer', 'min:0', 'max:999'],
            'rooms' => [$required, 'array', $draftSave ? 'min:0' : 'min:1'],
            'rooms.*.name' => [$required, 'string', 'max:120'],
            'rooms.*.capacity' => [$required, 'integer', 'min:1', 'max:50'],
            'rooms.*.bed_count' => ['nullable', 'integer', 'min:0', 'max:20'],
            'rooms.*.bed_type' => ['nullable', 'string', 'max:64'],
            'rooms.*.check_in_time' => ['nullable', 'date_format:H:i'],
            'rooms.*.check_out_time' => ['nullable', 'date_format:H:i'],
            'rooms.*.amenities' => ['nullable', 'array'],
            'rooms.*.photo_urls' => ['nullable', 'array', 'max:20'],
            'rooms.*.photo_urls.*' => ['string', 'max:500'],
        ])->validate();

        if (! $draftSave) {
            $totalPhotos = 0;
            foreach ($validated['rooms'] ?? [] as $room) {
                $totalPhotos += count($room['photo_urls'] ?? []);
            }
            if ($totalPhotos < 1) {
                throw ValidationException::withMessages([
                    'rooms' => ['Upload at least 1 property photo across your rooms.'],
                ]);
            }
        }

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function validateStep5(array $data, bool $draftSave = false): array
    {
        $required = $draftSave ? 'nullable' : 'required';

        return validator($data, [
            'rooms' => [$required, 'array', $draftSave ? 'min:0' : 'min:1'],
            'rooms.*.name' => [$required, 'string', 'max:120'],
            'rooms.*.weekday_price' => [$required, 'numeric', 'min:0'],
            'rooms.*.weekend_price' => [$required, 'numeric', 'min:0'],
        ])->validate();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function applyStep6(User $user, array $data): void
    {
        if ($user->registration_completed_at === null) {
            throw ValidationException::withMessages(['registration' => ['Finish registration (step 5) before verification.']]);
        }

        $method = (string) ($data['verification_method'] ?? '');
        $needsInternetAck = in_array($method, ['video', 'hybrid'], true);

        $validated = validator($data, [
            'verification_method' => ['required', Rule::in(ResortRegistrationCatalog::verificationMethods())],
            'stable_internet_acknowledged' => array_filter([
                $needsInternetAck ? 'required' : 'nullable',
                'boolean',
                $needsInternetAck ? 'accepted' : null,
            ]),
        ])->validate();

        $resort = $this->ownerResort($user);
        if ($resort === null) {
            throw ValidationException::withMessages(['resort' => ['Resort not found.']]);
        }

        foreach (ResortRegistrationCatalog::verificationDocumentTypes() as $type) {
            if (! ResortVerificationDocument::query()->where('resort_id', $resort->id)->where('document_type', $type)->exists()) {
                throw ValidationException::withMessages([
                    $type => ['This document is required.'],
                ]);
            }
        }

        $submissionNumber = max(1, (int) ($resort->verification_submission_count ?? 0) + 1);

        $resort->update([
            'verification_method' => $validated['verification_method'],
            'verification_submitted_at' => now(),
            'verification_status' => 'pending',
            'verification_rejection_reason' => null,
            'verification_submission_count' => $submissionNumber,
            'is_publicly_listed' => false,
        ]);

        $resort = $resort->fresh();

        $this->verificationNotifications->notifyOwnerDocumentsReceived($resort);
        $this->verificationNotifications->notifyAdminsNewSubmission($resort);

        $user->update(['onboarding_step' => 6]);
    }

    /**
     * @param  array<string, mixed>  $step
     */
    private function mergeDraftStep(ResortRegistrationDraft $draft, int $step, array $stepData): void
    {
        $payload = $draft->payload ?? [];
        $payload['step'.$step] = $stepData;
        $draft->update([
            'payload' => $payload,
            'current_step' => max($step + 1, (int) $draft->current_step),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validateFinishPayload(array $payload): void
    {
        foreach ([1, 2, 3, 4, 5] as $step) {
            if (! isset($payload['step'.$step]) || ! is_array($payload['step'.$step])) {
                throw ValidationException::withMessages([
                    'registration' => ["Step {$step} must be completed before finishing."],
                ]);
            }
        }

        $this->validateStep5($payload['step5']);
    }

    /**
     * @param  array<string, mixed>  $step2
     */
    private function syncBusinessProfile(Resort $resort, array $step2): void
    {
        ResortBusinessProfile::updateOrCreate(
            ['resort_id' => $resort->id],
            [
                'business_status' => $step2['business_status'] ?? 'unregistered',
                'business_name' => $step2['business_name'] ?? null,
                'business_address' => $step2['business_address'] ?? null,
                'business_contact_number' => $step2['business_contact_number'] ?? null,
                'business_tin' => $step2['business_tin'] ?? null,
                'sec_dti_number' => $step2['sec_dti_number'] ?? null,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $step4
     * @param  array<string, mixed>  $step5
     */
    private function syncRoomsFromDraft(Resort $resort, array $step4, array $step5): void
    {
        $pricingByName = [];
        foreach ($step5['rooms'] ?? [] as $priced) {
            $pricingByName[mb_strtolower(trim((string) ($priced['name'] ?? '')))] = $priced;
        }

        Room::withoutGlobalScopes()->where('resort_id', $resort->id)->delete();

        foreach ($step4['rooms'] ?? [] as $roomDraft) {
            $name = trim((string) ($roomDraft['name'] ?? 'Room'));
            $key = mb_strtolower($name);
            $priced = $pricingByName[$key] ?? null;
            $weekday = (float) ($priced['weekday_price'] ?? 0);
            $weekend = (float) ($priced['weekend_price'] ?? $weekday);
            $base = max($weekday, $weekend);

            $amenities = is_array($roomDraft['amenities'] ?? null) ? $roomDraft['amenities'] : [];
            if (isset($roomDraft['bed_count'])) {
                $amenities[] = 'BED_COUNT:'.(int) $roomDraft['bed_count'];
            }
            if (! empty($roomDraft['bed_type'])) {
                $amenities[] = 'BED_TYPE:'.(string) $roomDraft['bed_type'];
            }

            $room = Room::withoutGlobalScopes()->create([
                'tenant_id' => $resort->tenant_id,
                'resort_id' => $resort->id,
                'name' => $name,
                'code' => TenantPublicIdentifier::allocateUniqueRoomCode($resort->id, $name),
                'capacity' => (int) ($roomDraft['capacity'] ?? 2),
                'units' => 1,
                'base_price' => $base,
                'weekday_price' => $weekday,
                'weekend_price' => $weekend,
                'check_in_time' => $roomDraft['check_in_time'] ?? '14:00',
                'check_out_time' => $roomDraft['check_out_time'] ?? '12:00',
                'amenities' => array_values(array_unique($amenities)),
                'status' => 'active',
            ]);

            $sort = 0;
            foreach ($roomDraft['photo_urls'] ?? [] as $url) {
                if (! is_string($url) || trim($url) === '') {
                    continue;
                }
                RoomImage::create([
                    'room_id' => $room->id,
                    'tenant_id' => $resort->tenant_id,
                    'path' => $this->pathFromPublicUrl($url),
                    'disk' => 'public',
                    'sort_order' => $sort,
                    'is_primary' => $sort === 0,
                ]);
                $sort++;
            }
        }
    }

    private function pathFromPublicUrl(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (is_string($path) && str_contains($path, '/storage/')) {
            return ltrim(substr($path, strpos($path, '/storage/') + 9), '/');
        }

        return ltrim($path ?? $url, '/');
    }

    /**
     * @param  array<string, array<int, string>>  $grouped
     * @return list<string>
     */
    private function flattenAmenities(array $grouped, bool $parking): array
    {
        $out = [];
        foreach ($grouped as $items) {
            if (is_array($items)) {
                foreach ($items as $item) {
                    if (is_string($item) && $item !== '') {
                        $out[] = $item;
                    }
                }
            }
        }
        if ($parking) {
            $out[] = 'parking';
        }

        return array_values(array_unique($out));
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function resortAttributesFromOnboardInput(array $input): array
    {
        $attrs = [
            'name' => $input['resort_name'] ?? 'Resort',
            'description' => $input['description'] ?? null,
            'contact_number' => $input['contact_number'] ?? null,
            'representative_name' => $input['representative_name'] ?? null,
            'representative_contact_number' => $input['representative_contact_number'] ?? null,
            'amenities' => $input['amenities'] ?? [],
            'is_publicly_listed' => $input['is_publicly_listed'] ?? false,
            'address_province_psgc' => $input['address_province_psgc'] ?? null,
            'address_city_municipality_psgc' => $input['address_city_municipality_psgc'] ?? null,
            'address_barangay_psgc' => $input['address_barangay_psgc'] ?? null,
            'address_barangay_name' => $input['address_barangay_name'] ?? null,
            'address_street_line' => $input['address_street_line'] ?? null,
            'map_latitude' => $input['map_latitude'] ?? null,
            'map_longitude' => $input['map_longitude'] ?? null,
            'address_label' => $input['address_label'] ?? null,
            'logo_url' => $input['logo_url'] ?? null,
            'facebook_url' => $input['facebook_url'] ?? null,
            'instagram_url' => $input['instagram_url'] ?? null,
            'tiktok_url' => $input['tiktok_url'] ?? null,
            'website_url' => $input['website_url'] ?? null,
        ];

        if (Schema::hasColumn('resorts', 'background_image_url')) {
            $attrs['background_image_url'] = $input['background_image_url'] ?? null;
        }

        return $attrs;
    }

    /**
     * @return array<string, mixed>
     */
    private function userStepSnapshot(User $user): array
    {
        return [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'birth_date' => $user->birth_date?->format('Y-m-d'),
            'has_password' => filled($user->password),
            'owner_mailing_province_psgc' => $user->owner_mailing_province_psgc,
            'owner_mailing_city_municipality_psgc' => $user->owner_mailing_city_municipality_psgc,
            'owner_mailing_barangay_psgc' => $user->owner_mailing_barangay_psgc,
            'owner_mailing_barangay_name' => $user->owner_mailing_barangay_name,
            'owner_mailing_street_line' => $user->owner_mailing_street_line,
            'owner_mailing_location_label' => $user->owner_mailing_location_label,
        ];
    }
}
