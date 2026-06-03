<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Resort;
use App\Models\Tenant;

final class ResortLinkVerificationService
{
    public function __construct(
        private readonly PhilippineLocationService $locations,
        private readonly LandingReadinessService $landing,
    ) {}

    /**
     * Verify a URL against the resort database.
     *
     * @return array{verified: bool, resort: array|null, message: string|null}
     */
    public function verify(string $url): array
    {
        $resort = $this->findResortByUrl($url);

        if ($resort === null) {
            return [
                'verified' => false,
                'resort' => null,
                'message' => 'This link does not match any resort in our database.',
            ];
        }

        $isVerified = ($resort->verification_status ?? 'not_verified') === 'verified';

        if (! $isVerified) {
            return [
                'verified' => false,
                'resort' => [
                    'id' => $resort->id,
                    'name' => $resort->name,
                ],
                'message' => null,
            ];
        }

        $resort->loadMissing(['tenant:id,subdomain', 'rooms' => fn ($q) => $q->where('status', 'active')->with('images')->limit(6)]);

        $slug = $resort->tenant?->subdomain;
        $slug = is_string($slug) ? trim($slug) : '';
        $slug = $slug !== '' ? $slug : null;

        $rooms = $resort->rooms->map(fn ($room) => [
            'name' => $room->name,
            'basePrice' => (float) $room->base_price,
            'images' => $room->images->map(fn ($img) => [
                'id' => $img->id,
                'url' => $img->url,
            ])->all(),
        ])->all();

        // Compute priceFrom (lowest active room price)
        $allPrices = $resort->rooms->pluck('base_price')->filter(fn ($p) => $p > 0)->all();
        $priceFrom = count($allPrices) > 0 ? min($allPrices) : null;

        // Determine premium/VIP status
        $isPremiumVerified = ($resort->subscription_plan === 'business_pro') || ($resort->verification_status === 'verified' && $resort->is_premium_verified);
        $badgeLabel = $isPremiumVerified ? 'Premium Verified Resort' : ($resort->verification_status === 'verified' ? 'Verified Resort' : null);

        // Get map data
        $mapData = $this->landing->mapPayloadForResort($resort);

        return [
            'verified' => true,
            'resort' => [
                'id' => $resort->id,
                'name' => $resort->name,
                'slug' => $slug,
                'description' => $resort->description,
                'logoUrl' => $resort->logo_url,
                'backgroundImageUrl' => $resort->background_image_url,
                'address' => $this->locations->resortDisplayLine($resort),
                'badgeLabel' => $badgeLabel,
                'isPremiumVerified' => (bool) $isPremiumVerified,
                'roomsCount' => $resort->rooms->count(),
                'rooms' => $rooms,
                'priceFrom' => $priceFrom ? (float) $priceFrom : null,
                'map' => [
                    'address' => $mapData['address'] ?? null,
                    'embedUrl' => $mapData['embedUrl'] ?? null,
                    'searchUrl' => $mapData['searchUrl'] ?? null,
                ],
                'landingUrl' => $slug ? "/resort/{$slug}" : null,
                'verificationStatus' => $resort->verification_status,
                'isVip' => (bool) $resort->is_vip,
            ],
            'message' => null,
        ];
    }

    private function findResortByUrl(string $url): ?Resort
    {
        $normalized = $this->normalizeUrl($url);

        if ($normalized === null) {
            return null;
        }

        // 1. Check if it's an Anti-Scam PH landing page link: /resort/{slug}
        $slug = $this->extractLandingSlug($normalized);
        if ($slug !== null) {
            $tenant = Tenant::withoutGlobalScopes()->where('subdomain', $slug)->first();
            if ($tenant) {
                return Resort::withoutGlobalScopes()->where('tenant_id', $tenant->id)->first();
            }
            return null;
        }

        // 2. Check social media URLs (normalized comparison)
        $host = $normalized['host'];
        $path = $normalized['path'];

        // Facebook
        if ($this->isSocialHost($host, ['facebook.com', 'fb.com', 'm.facebook.com', 'web.facebook.com'])) {
            $resort = $this->findResortBySocialColumn('facebook_url', $host, $path);
            if ($resort) return $resort;
        }

        // Instagram
        if ($this->isSocialHost($host, ['instagram.com', 'www.instagram.com'])) {
            $resort = $this->findResortBySocialColumn('instagram_url', $host, $path);
            if ($resort) return $resort;
        }

        // TikTok
        if ($this->isSocialHost($host, ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'])) {
            $resort = $this->findResortBySocialColumn('tiktok_url', $host, $path);
            if ($resort) return $resort;
        }

        // 3. Check website_url
        $resort = $this->findResortByWebsiteUrl($host, $path);
        if ($resort) return $resort;

        // 4. Last resort: check ALL social columns for any match
        $allColumns = ['facebook_url', 'instagram_url', 'tiktok_url', 'website_url'];
        foreach ($allColumns as $col) {
            $resorts = Resort::withoutGlobalScopes()
                ->whereNotNull($col)
                ->get(['id', $col]);

            foreach ($resorts as $r) {
                $stored = $this->normalizeUrl((string) $r->{$col});
                if ($stored && $stored['host'] === $host && $stored['path'] === $path) {
                    return Resort::withoutGlobalScopes()->find($r->id);
                }
            }
        }

        return null;
    }

    private function findResortBySocialColumn(string $column, string $host, string $path): ?Resort
    {
        $candidates = Resort::withoutGlobalScopes()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->get(['id', $column]);

        foreach ($candidates as $resort) {
            $stored = $this->normalizeUrl((string) $resort->{$column});
            if ($stored && $stored['host'] === $host && $stored['path'] === $path) {
                return Resort::withoutGlobalScopes()->find($resort->id);
            }
        }

        return null;
    }

    private function findResortByWebsiteUrl(string $host, string $path): ?Resort
    {
        $candidates = Resort::withoutGlobalScopes()
            ->whereNotNull('website_url')
            ->where('website_url', '!=', '')
            ->get(['id', 'website_url']);

        foreach ($candidates as $resort) {
            $stored = $this->normalizeUrl((string) $resort->website_url);
            if (! $stored) continue;

            // Match by host (domain), ignore path for website URLs
            if ($stored['host'] === $host) {
                return Resort::withoutGlobalScopes()->find($resort->id);
            }
        }

        return null;
    }

    /**
     * Extract a landing page slug from a URL like /resort/{slug}.
     */
    private function extractLandingSlug(array $normalized): ?string
    {
        $path = $normalized['path'];
        if (preg_match('#^/resort/([a-zA-Z0-9_-]+)#', $path, $m)) {
            return $m[1];
        }
        return null;
    }

    private function isSocialHost(string $host, array $socialHosts): bool
    {
        foreach ($socialHosts as $sh) {
            if ($host === $sh || $host === 'www.'.$sh || str_ends_with($host, '.'.$sh)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Normalize a URL into host + path components for comparison.
     *
     * @return array{host: string, path: string}|null
     */
    private function normalizeUrl(string $url): ?array
    {
        $url = trim($url);
        if ($url === '') return null;

        // Add scheme if missing
        if (! preg_match('#^https?://#i', $url)) {
            $url = 'https://'.$url;
        }

        $parts = parse_url($url);
        if (! $parts || empty($parts['host'])) return null;

        $host = strtolower($parts['host']);
        // Strip www. prefix
        if (str_starts_with($host, 'www.')) {
            $host = substr($host, 4);
        }

        $path = $parts['path'] ?? '/';
        // Strip trailing slash (but keep root /)
        $path = rtrim($path, '/') ?: '/';

        return ['host' => $host, 'path' => $path];
    }
}
