<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Models\Tenant;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminOnboardController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly SubscriptionService $subscriptions) {}

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tenant_name' => ['required', 'string', 'max:120'],
            'resort_name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'address' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'logo_url' => ['nullable', 'url', 'max:2048'],
            'plan' => ['required', 'in:standard,vip'],
            'subdomain' => ['nullable', 'string', 'max:80', 'alpha_dash', 'unique:tenants,subdomain'],
            'slug' => ['nullable', 'string', 'max:120', 'alpha_dash', 'unique:tenants,slug'],
            'is_publicly_listed' => ['nullable', 'boolean'],
        ]);

        $payload = DB::transaction(function () use ($validated): array {
            $seed = Str::slug($validated['tenant_name']);
            $base = $seed !== '' ? $seed : 'resort';
            $suffix = Str::lower(Str::random(6));

            $tenant = Tenant::create([
                'name' => $validated['tenant_name'],
                'slug' => $validated['slug'] ?? "{$base}-{$suffix}",
                'subdomain' => $validated['subdomain'] ?? "{$base}-{$suffix}",
                'status' => 'active',
            ]);

            $resort = Resort::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'name' => $validated['resort_name'],
                'description' => $validated['description'] ?? null,
                'address' => $validated['address'] ?? null,
                'contact_number' => $validated['contact_number'] ?? null,
                'logo_url' => $validated['logo_url'] ?? null,
                'is_publicly_listed' => $validated['is_publicly_listed'] ?? true,
            ]);

            $subscription = $this->subscriptions->refreshForResort($resort, $validated['plan']);

            return [
                'tenant' => $tenant,
                'resort' => $resort->fresh()->loadCount('rooms'),
                'subscription' => $subscription,
            ];
        });

        return $this->successResponse($payload, 'Resort onboarded successfully', 201);
    }
}
