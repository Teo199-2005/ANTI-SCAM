<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Legal\PlatformTerms;
use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Services\EmailNotificationService;
use App\Services\PhilippineLocationService;
use App\Shared\Traits\ApiResponseTrait;
use App\Support\MultipartUploadHints;
use App\Support\TenantPublicIdentifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AdminOnboardController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly SubscriptionService $subscriptions,
        private readonly EmailNotificationService $emailNotifications,
        private readonly PhilippineLocationService $locations,
    ) {}

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tenant_name' => ['required', 'string', 'max:120'],
            'resort_name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'address_province_psgc' => ['nullable', 'string', 'max:12'],
            'address_city_municipality_psgc' => ['nullable', 'string', 'max:12'],
            'address_barangay_psgc' => ['nullable', 'string', 'max:12'],
            'address_label' => ['nullable', 'string', 'max:512'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'logo_url' => ['nullable', 'string', 'max:2048'],
            'plan' => ['required', 'in:basic'],
            'owner_user_id' => ['required', 'integer', 'exists:users,id'],
            'subdomain' => ['nullable', 'string', 'max:80', 'alpha_dash', 'unique:tenants,subdomain'],
            'slug' => ['nullable', 'string', 'max:120', 'alpha_dash', 'unique:tenants,slug'],
            'is_publicly_listed' => ['nullable', 'boolean'],
            'accept_terms' => ['required', 'accepted'],
        ]);

        $this->locations->assertValidTripleOrEmpty(
            filled($validated['address_province_psgc'] ?? null) ? (string) $validated['address_province_psgc'] : null,
            filled($validated['address_city_municipality_psgc'] ?? null) ? (string) $validated['address_city_municipality_psgc'] : null,
            filled($validated['address_barangay_psgc'] ?? null) ? (string) $validated['address_barangay_psgc'] : null,
        );

        $payload = DB::transaction(function () use ($validated): array {
            $base = TenantPublicIdentifier::preferredSubdomainBaseFromResortName(
                $validated['resort_name'],
                $validated['tenant_name'],
            );
            $publicKey = $validated['subdomain']
                ?? TenantPublicIdentifier::allocateUniqueSubdomain($base);

            $tenant = Tenant::create([
                'name' => $validated['tenant_name'],
                'slug' => $validated['slug'] ?? $publicKey,
                'subdomain' => $publicKey,
                'status' => 'active',
            ]);

            $owner = User::withoutGlobalScopes()
                ->where('id', $validated['owner_user_id'])
                ->where('role', 'resort_owner')
                ->lockForUpdate()
                ->first();

            if (! $owner) {
                throw ValidationException::withMessages([
                    'owner_user_id' => ['Selected owner account is invalid.'],
                ]);
            }

            if ($owner->tenant_id !== null) {
                throw ValidationException::withMessages([
                    'owner_user_id' => ['Selected owner account is already assigned to another tenant.'],
                ]);
            }

            $owner->update([
                'tenant_id' => $tenant->id,
                'terms_accepted_at' => now(),
                'terms_version' => PlatformTerms::version(),
            ]);

            $resortPayload = [
                'tenant_id' => $tenant->id,
                'name' => $validated['resort_name'],
                'description' => $validated['description'] ?? null,
                'address_province_psgc' => filled($validated['address_province_psgc'] ?? null) ? (string) $validated['address_province_psgc'] : null,
                'address_city_municipality_psgc' => filled($validated['address_city_municipality_psgc'] ?? null) ? (string) $validated['address_city_municipality_psgc'] : null,
                'address_barangay_psgc' => filled($validated['address_barangay_psgc'] ?? null) ? (string) $validated['address_barangay_psgc'] : null,
                'address_label' => filled($validated['address_label'] ?? null) ? (string) $validated['address_label'] : null,
                'contact_number' => $validated['contact_number'] ?? null,
                'is_publicly_listed' => $validated['is_publicly_listed'] ?? true,
            ];

            // Backward compatibility: older sqlite files may not have logo_url yet.
            if (Schema::hasColumn('resorts', 'logo_url')) {
                $resortPayload['logo_url'] = $validated['logo_url'] ?? null;
            }

            $resort = Resort::withoutGlobalScopes()->create($resortPayload);
            $this->locations->syncResortAddressLabel($resort);

            $subscription = $this->subscriptions->refreshForResort($resort, 'basic');

            return [
                'tenant' => $tenant,
                'resort' => $resort->fresh()->loadCount('rooms'),
                'subscription' => $subscription,
                'owner' => $owner->fresh(),
            ];
        });

        $this->emailNotifications->sendTermsAccepted($payload['owner'], 'admin resort onboarding');

        unset($payload['owner']);

        return $this->successResponse($payload, 'Resort onboarded successfully', 201);
    }

    public function assignableOwners()
    {
        $owners = User::withoutGlobalScopes()
            ->where('role', 'resort_owner')
            ->whereNull('tenant_id')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return $this->successResponse($owners, 'Assignable owners fetched');
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            // Logos: common formats, up to ~12 MB (high-res PNG / marketing exports).
            'logo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp,gif,bmp,tif,tiff', 'max:12288'],
        ]);

        $path = $request->file('logo')->store('resort-logos', 'public');

        return $this->successResponse([
            'logo_url' => '/storage/'.$path,
        ], 'Resort logo uploaded');
    }

    public function ownerStore(Request $request)
    {
        $user = $request->user();
        if (! $user || $user->role !== 'resort_owner') {
            abort(403, 'Only resort owner accounts can onboard a resort.');
        }

        if ($user->tenant_id !== null) {
            return $this->errorResponse('This resort owner account is already assigned to a tenant.', null, 409);
        }

        $validated = $request->validate([
            'tenant_name' => ['required', 'string', 'max:120'],
            'resort_name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'address_province_psgc' => ['nullable', 'string', 'max:12'],
            'address_city_municipality_psgc' => ['nullable', 'string', 'max:12'],
            'address_barangay_psgc' => ['nullable', 'string', 'max:12'],
            'address_label' => ['nullable', 'string', 'max:512'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'logo_url' => ['nullable', 'string', 'max:2048'],
            'plan' => ['nullable', 'in:basic'],
            'subdomain' => ['nullable', 'string', 'max:80', 'alpha_dash', 'unique:tenants,subdomain'],
            'slug' => ['nullable', 'string', 'max:120', 'alpha_dash', 'unique:tenants,slug'],
            'is_publicly_listed' => ['nullable', 'boolean'],
            'accept_terms' => ['required', 'accepted'],
        ]);

        $this->locations->assertValidTripleOrEmpty(
            filled($validated['address_province_psgc'] ?? null) ? (string) $validated['address_province_psgc'] : null,
            filled($validated['address_city_municipality_psgc'] ?? null) ? (string) $validated['address_city_municipality_psgc'] : null,
            filled($validated['address_barangay_psgc'] ?? null) ? (string) $validated['address_barangay_psgc'] : null,
        );

        $payload = DB::transaction(function () use ($validated, $user): array {
            $base = TenantPublicIdentifier::preferredSubdomainBaseFromResortName(
                $validated['resort_name'],
                $validated['tenant_name'],
            );
            $publicKey = $validated['subdomain']
                ?? TenantPublicIdentifier::allocateUniqueSubdomain($base);

            $tenant = Tenant::create([
                'name' => $validated['tenant_name'],
                'slug' => $validated['slug'] ?? $publicKey,
                'subdomain' => $publicKey,
                'status' => 'active',
            ]);

            $user->update([
                'tenant_id' => $tenant->id,
                'terms_accepted_at' => now(),
                'terms_version' => PlatformTerms::version(),
            ]);

            $resortPayload = [
                'tenant_id' => $tenant->id,
                'name' => $validated['resort_name'],
                'description' => $validated['description'] ?? null,
                'address_province_psgc' => filled($validated['address_province_psgc'] ?? null) ? (string) $validated['address_province_psgc'] : null,
                'address_city_municipality_psgc' => filled($validated['address_city_municipality_psgc'] ?? null) ? (string) $validated['address_city_municipality_psgc'] : null,
                'address_barangay_psgc' => filled($validated['address_barangay_psgc'] ?? null) ? (string) $validated['address_barangay_psgc'] : null,
                'address_label' => filled($validated['address_label'] ?? null) ? (string) $validated['address_label'] : null,
                'contact_number' => $validated['contact_number'] ?? null,
                'is_publicly_listed' => $validated['is_publicly_listed'] ?? true,
            ];

            if (Schema::hasColumn('resorts', 'logo_url')) {
                $resortPayload['logo_url'] = $validated['logo_url'] ?? null;
            }

            $resort = Resort::withoutGlobalScopes()->create($resortPayload);
            $this->locations->syncResortAddressLabel($resort);
            $subscription = $this->subscriptions->refreshForResort($resort, 'basic');

            return [
                'tenant' => $tenant,
                'resort' => $resort->fresh()->loadCount('rooms'),
                'subscription' => $subscription,
                'owner' => $user->fresh(),
            ];
        });

        $this->emailNotifications->sendTermsAccepted($payload['owner'], 'resort onboarding');

        unset($payload['owner']);

        return $this->successResponse($payload, 'Resort onboarded successfully', 201);
    }

    public function ownerUploadLogo(Request $request)
    {
        $user = $request->user();
        if (! $user || $user->role !== 'resort_owner') {
            abort(403, 'Only resort owner accounts can upload logos here.');
        }

        if (! $request->hasFile('logo')) {
            return $this->errorResponse(
                MultipartUploadHints::missingFileMessage($request, 'logo'),
                null,
                422
            );
        }

        $request->validate([
            // Logos: common formats, up to ~12 MB.
            'logo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp,gif,bmp,tif,tiff', 'max:12288'],
        ], [
            'logo.required' => 'Please choose a logo image to upload.',
            'logo.image' => 'The file must be a valid image (JPEG, PNG, WebP, GIF, BMP, or TIFF).',
            'logo.mimes' => 'Use JPEG, PNG, WebP, GIF, BMP, or TIFF — not HEIC/RAW unless converted.',
            'logo.max' => 'Logo images may be at most 12 MB.',
        ]);

        $uploaded = $request->file('logo');
        if (! $uploaded->isValid()) {
            return $this->errorResponse(
                'Upload rejected: '.$uploaded->getErrorMessage().' (code '.$uploaded->getError().'). '
                .'Try `composer run serve` from `backend`, or raise PHP `upload_max_filesize` / `post_max_size`.',
                null,
                422
            );
        }

        $resort = Resort::withoutGlobalScopes()
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (! $resort) {
            return $this->errorResponse('No resort found for this account.', null, 404);
        }

        if ($resort->logo_url && str_starts_with((string) $resort->logo_url, '/storage/')) {
            $relative = substr((string) $resort->logo_url, strlen('/storage/'));
            Storage::disk('public')->delete($relative);
        }

        $path = $uploaded->store('resort-logos', 'public');
        $logoUrl = '/storage/'.$path;

        $resort->update(['logo_url' => $logoUrl]);

        return $this->successResponse([
            'logo_url' => $logoUrl,
        ], 'Resort logo uploaded');
    }
}
