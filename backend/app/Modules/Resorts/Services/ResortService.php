<?php

namespace App\Modules\Resorts\Services;

use App\Models\Resort;
use App\Models\User;
use App\Support\SafeSort;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class ResortService
{
    public function list(User $user, int $perPage = 10, ?string $search = null, ?string $sortBy = null, ?string $sortDir = null): LengthAwarePaginator
    {
        $query = Resort::query()
            ->with('subscription')
            ->withCount('rooms');

        if ($search) {
            $query->where(function (Builder $inner) use ($search): void {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhere('contact_number', 'like', "%{$search}%");
            });
        }

        if ($user->role !== 'admin') {
            $query->where('tenant_id', $user->tenant_id);
        }

        SafeSort::apply($query, $sortBy, $sortDir, ['name', 'created_at', 'address'], 'created_at', 'desc');

        return $query->paginate($perPage);
    }

    public function create(array $payload, User $creator): Resort
    {
        return Resort::create([
            'tenant_id' => $payload['tenant_id'] ?? $creator->tenant_id,
            'name' => $payload['name'],
            'description' => $payload['description'] ?? null,
            'address' => $payload['address'] ?? null,
            'contact_number' => $payload['contact_number'] ?? null,
            'logo_url' => $payload['logo_url'] ?? null,
            'is_publicly_listed' => $payload['is_publicly_listed'] ?? true,
        ]);
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
            'address',
            'contact_number',
            'logo_url',
            'background_image_url',
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
        }

        return $resort->refresh()->load('subscription')->loadCount('rooms');
    }

    public function delete(Resort $resort): void
    {
        $resort->delete();
    }

    public function generateTenantMetadata(string $name): array
    {
        $baseSlug = Str::slug($name);
        $base = $baseSlug !== '' ? $baseSlug : 'resort';
        $unique = $base.'-'.Str::lower(Str::random(6));

        return [
            'slug' => $unique,
            'subdomain' => $unique,
        ];
    }
}
