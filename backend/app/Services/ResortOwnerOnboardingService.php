<?php

namespace App\Services;

use App\Legal\PlatformTerms;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Support\TenantPublicIdentifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class ResortOwnerOnboardingService
{
    public function __construct(
        private readonly SubscriptionService $subscriptions,
        private readonly PhilippineLocationService $locations,
        private readonly ReferralSignupTrialService $referralSignupTrial,
    ) {}

    /**
     * Default tenant/resort names from owner display name and optional business name.
     *
     * @return array{tenant_name: string, resort_name: string}
     */
    public function defaultNamesFromOwner(User $owner, ?string $businessName = null): array
    {
        $ownerLabel = trim((string) $owner->name);
        if ($ownerLabel === '') {
            $ownerLabel = 'Resort Owner';
        }

        $business = $businessName !== null ? trim($businessName) : '';
        $tenantName = $business !== '' ? $business : $ownerLabel;
        $resortName = $business !== '' ? $business : "{$ownerLabel}'s Resort";

        return [
            'tenant_name' => $tenantName,
            'resort_name' => $resortName,
        ];
    }

    /**
     * Create tenant, resort, and subscription for a resort owner without a tenant.
     *
     * @param  array<string, mixed>  $input
     * @return array{tenant: Tenant, resort: Resort, subscription: Subscription, owner: User}
     */
    public function onboardOwner(User $owner, array $input): array
    {
        if ($owner->role !== 'resort_owner') {
            throw ValidationException::withMessages([
                'owner' => ['Only resort owner accounts can be onboarded.'],
            ]);
        }

        if ($owner->tenant_id !== null) {
            throw ValidationException::withMessages([
                'owner' => ['This resort owner account is already assigned to a tenant.'],
            ]);
        }

        $defaults = $this->defaultNamesFromOwner($owner, $input['business_name'] ?? null);

        $tenantName = trim((string) ($input['tenant_name'] ?? $defaults['tenant_name']));
        $resortName = trim((string) ($input['resort_name'] ?? $defaults['resort_name']));

        $this->locations->assertValidPhilippineLocationOrEmpty(
            filled($input['address_province_psgc'] ?? null) ? (string) $input['address_province_psgc'] : null,
            filled($input['address_city_municipality_psgc'] ?? null) ? (string) $input['address_city_municipality_psgc'] : null,
            isset($input['address_barangay_name']) ? trim((string) $input['address_barangay_name']) : null,
            filled($input['address_barangay_psgc'] ?? null) ? (string) $input['address_barangay_psgc'] : null,
        );

        return DB::transaction(function () use ($owner, $input, $tenantName, $resortName): array {
            $locked = User::withoutGlobalScopes()
                ->where('id', $owner->id)
                ->where('role', 'resort_owner')
                ->lockForUpdate()
                ->first();

            if (! $locked || $locked->tenant_id !== null) {
                throw ValidationException::withMessages([
                    'owner' => ['This resort owner account is already assigned to a tenant.'],
                ]);
            }

            $base = TenantPublicIdentifier::preferredSubdomainBaseFromResortName($resortName, $tenantName);
            $publicKey = isset($input['subdomain']) && $input['subdomain'] !== ''
                ? (string) $input['subdomain']
                : TenantPublicIdentifier::allocateUniqueSubdomain($base);

            $tenant = Tenant::create([
                'name' => $tenantName,
                'slug' => $input['slug'] ?? $publicKey,
                'subdomain' => $publicKey,
                'status' => 'active',
            ]);

            $ownerUpdate = ['tenant_id' => $tenant->id];
            if ($locked->terms_accepted_at === null) {
                $ownerUpdate['terms_accepted_at'] = now();
                $ownerUpdate['terms_version'] = PlatformTerms::version();
            }

            $locked->update($ownerUpdate);

            $resortPayload = [
                'tenant_id' => $tenant->id,
                'name' => $resortName,
                'description' => $input['description'] ?? null,
                'address_province_psgc' => filled($input['address_province_psgc'] ?? null) ? (string) $input['address_province_psgc'] : null,
                'address_city_municipality_psgc' => filled($input['address_city_municipality_psgc'] ?? null) ? (string) $input['address_city_municipality_psgc'] : null,
                'address_barangay_psgc' => filled($input['address_barangay_psgc'] ?? null) ? (string) $input['address_barangay_psgc'] : null,
                'address_barangay_name' => filled($input['address_barangay_name'] ?? null) ? trim((string) $input['address_barangay_name']) : null,
                'address_label' => filled($input['address_label'] ?? null) ? (string) $input['address_label'] : null,
                'contact_number' => $input['contact_number'] ?? null,
                'is_publicly_listed' => $input['is_publicly_listed'] ?? false,
            ];

            if (Schema::hasColumn('resorts', 'logo_url')) {
                $resortPayload['logo_url'] = $input['logo_url'] ?? null;
            }

            $resort = Resort::withoutGlobalScopes()->create($resortPayload);
            $this->locations->syncResortAddressLabel($resort);

            $plan = (string) ($input['plan'] ?? 'basic');
            $subscription = $this->subscriptions->refreshForResort($resort, $plan);
            $subscription = $this->referralSignupTrial->applyTrialAfterOnboard($locked->fresh(), $resort, $subscription);

            return [
                'tenant' => $tenant,
                'resort' => $resort->fresh()->loadCount('rooms'),
                'subscription' => $subscription,
                'owner' => $locked->fresh(),
            ];
        });
    }
}
