<?php

namespace App\Modules\Resorts\Services;

use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PhilippineLocationService;
use App\Support\SafeSort;
use App\Support\TenantPublicIdentifier;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ResortService
{
    public function __construct(
        private readonly PhilippineLocationService $locations,
    ) {}

    public function list(User $user, int $perPage = 10, ?string $search = null, ?string $sortBy = null, ?string $sortDir = null): LengthAwarePaginator
    {
        $query = Resort::query()
            ->with('subscription')
            ->with('tenant:id,subdomain')
            ->withCount('rooms');

        if ($search) {
            $query->where(function (Builder $inner) use ($search): void {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('address_label', 'like', "%{$search}%")
                    ->orWhere('contact_number', 'like', "%{$search}%");
            });
        }

        if ($user->role !== 'admin') {
            $query->where('tenant_id', $user->tenant_id);
        }

        SafeSort::apply($query, $sortBy, $sortDir, ['name', 'created_at', 'address_label'], 'created_at', 'desc');

        return $query->paginate($perPage);
    }

    public function create(array $payload, User $creator): Resort
    {
        $resort = Resort::create([
            'tenant_id' => $payload['tenant_id'] ?? $creator->tenant_id,
            'name' => $payload['name'],
            'description' => $payload['description'] ?? null,
            'address_province_psgc' => $payload['address_province_psgc'] ?? null,
            'address_city_municipality_psgc' => $payload['address_city_municipality_psgc'] ?? null,
            'address_barangay_psgc' => $payload['address_barangay_psgc'] ?? null,
            'address_barangay_name' => $payload['address_barangay_name'] ?? null,
            'address_street_line' => $payload['address_street_line'] ?? null,
            'map_latitude' => $payload['map_latitude'] ?? null,
            'map_longitude' => $payload['map_longitude'] ?? null,
            'address_label' => $payload['address_label'] ?? null,
            'contact_number' => $payload['contact_number'] ?? null,
            'logo_url' => $payload['logo_url'] ?? null,
            'is_publicly_listed' => $payload['is_publicly_listed'] ?? true,
        ]);
        $this->locations->syncResortAddressLabel($resort);

        return $resort->fresh();
    }

    public function update(Resort $resort, array $payload): Resort
    {
        // Use array_key_exists so that explicit null values ARE applied (e.g. clearing a field),
        // but omitted keys do NOT overwrite existing values. The old `??` pattern would silently
        // overwrite existing data with the PHP null produced by a missing array key.
        $changes = [];
        foreach ([
            'name',
            'description',
            'address_province_psgc',
            'address_city_municipality_psgc',
            'address_barangay_psgc',
            'address_barangay_name',
            'address_street_line',
            'map_latitude',
            'map_longitude',
            'address_label',
            'contact_number',
            'logo_url',
            'background_image_url',
            'facebook_url',
            'instagram_url',
            'tiktok_url',
            'representative_name',
            'representative_contact_number',
            'cancellation_policy',
            'amenities',
            'is_publicly_listed',
        ] as $field) {
            if (array_key_exists($field, $payload)) {
                $changes[$field] = $payload[$field];
            }
        }

        if (! empty($changes)) {
            $resort->update($changes);
            $resort->refresh();
            $this->locations->syncResortAddressLabel($resort);
        }

        // Always align /resort/{subdomain} with the persisted resort name (fixes legacy slugs even when
        // the request omits `name` or only partial fields are validated).
        $resort->refresh()->loadMissing('tenant');
        $tenant = $resort->tenant;
        if ($tenant instanceof Tenant) {
            $idealBase = TenantPublicIdentifier::preferredSubdomainBaseFromResortName($resort->name, null);
            if ($tenant->subdomain !== $idealBase) {
                $newSub = TenantPublicIdentifier::allocateUniqueSubdomain($idealBase, $tenant->id);
                if ($newSub !== $tenant->subdomain) {
                    $tenant->update(['subdomain' => $newSub, 'slug' => $newSub]);
                }
            }
        }

        return $resort->refresh()->load('subscription')->loadCount('rooms');
    }

    public function delete(Resort $resort): void
    {
        $resort->delete();
    }

    public function generateTenantMetadata(string $name): array
    {
        $base = TenantPublicIdentifier::preferredSubdomainBaseFromResortName($name, null);
        $unique = TenantPublicIdentifier::allocateUniqueSubdomain($base);

        return [
            'slug' => $unique,
            'subdomain' => $unique,
        ];
    }
}
