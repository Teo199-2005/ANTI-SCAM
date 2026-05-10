<?php

namespace App\Services;

use App\Models\Resort;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class LandingReadinessService
{
    /**
     * Check whether a resort's profile and rooms are complete enough to:
     *  (a) display a public landing page, AND
     *  (b) be eligible for the referral first-month-free promo.
     *
     * Returns:
     *   is_ready       bool
     *   missing_fields string[]  — human-readable field keys the owner still needs to fill
     */
    public function check(Resort $resort): array
    {
        $missing = [];

        if (empty($resort->name)) {
            $missing[] = 'resort_name';
        }
        if (empty($resort->address)) {
            $missing[] = 'address';
        }
        if (empty($resort->contact_number)) {
            $missing[] = 'contact_number';
        }
        if (empty($resort->logo_url)) {
            $missing[] = 'logo';
        }
        if (empty($resort->background_image_url)) {
            $missing[] = 'background_image';
        }

        // Require at least one active room with at least one image so the
        // listing is genuinely bookable, not just header-complete.
        $hasActiveRoomWithImage = $resort->rooms()
            ->with('images')
            ->where('status', 'active')
            ->get()
            ->contains(fn ($room) => $room->images->isNotEmpty());

        if (! $hasActiveRoomWithImage) {
            $missing[] = 'room_with_image';
        }

        return [
            'is_ready' => count($missing) === 0,
            'missing_fields' => $missing,
        ];
    }

    /**
     * Build the fully computed landing-page payload from Resort + Owner + Rooms.
     * This is the single source of truth for the public landing page.
     */
    public function computePayload(Resort $resort, ?User $owner): array
    {
        // Rooms (active only) with images
        $rooms = $resort->rooms()
            ->with('images')
            ->where('status', 'active')
            ->get();

        // Gallery: up to 6 primary (or first) images across all rooms
        $gallery = [];
        foreach ($rooms as $room) {
            $img = $room->images->firstWhere('is_primary', true) ?? $room->images->first();
            if ($img) {
                $gallery[] = Storage::disk($img->disk)->url($img->path);
            }
            if (count($gallery) >= 6) {
                break;
            }
        }

        // Google Maps embed URL (no API key needed for basic search embed)
        $mapEmbedUrl = null;
        $mapSearchUrl = null;
        if (! empty($resort->address)) {
            $encoded = rawurlencode($resort->address);
            $mapEmbedUrl = "https://maps.google.com/maps?q={$encoded}&output=embed&z=15";
            $mapSearchUrl = "https://www.google.com/maps/search/?api=1&query={$encoded}";
        }

        return [
            'hero' => [
                'heading' => $resort->name,
                'subheading' => $resort->description,
                'bgImageUrl' => $resort->background_image_url,
                'logoUrl' => $resort->logo_url,
            ],
            'about' => [
                'heading' => 'About '.$resort->name,
                'body' => $resort->description,
            ],
            'rooms' => $rooms->map(fn ($room): array => [
                'id' => $room->id,
                'name' => $room->name,
                'capacity' => $room->capacity,
                'units' => max(1, (int) ($room->units ?? 1)),
                'basePrice' => (float) $room->base_price,
                'amenities' => $room->amenities ?? [],
                'rules' => $room->rules,
                'images' => $room->images->map(
                    fn ($img): string => Storage::disk($img->disk)->url($img->path)
                )->values()->all(),
            ])->values()->all(),
            'gallery' => $gallery,
            'footer' => [
                'ownerName' => $owner?->name,
                'ownerContact' => $owner?->phone,
                'representativeName' => $resort->representative_name,
                'representativeContact' => $resort->representative_contact_number,
                'contactEmail' => $owner?->email,
                'resortContact' => $resort->contact_number,
                'address' => $resort->address,
            ],
            'map' => [
                'address' => $resort->address,
                'embedUrl' => $mapEmbedUrl,
                'searchUrl' => $mapSearchUrl,
            ],
        ];
    }

    /**
     * Resolve the owner user for a resort (resort_owner role in the same tenant).
     */
    public function resolveOwner(Resort $resort): ?User
    {
        return User::withoutGlobalScopes()
            ->where('tenant_id', $resort->tenant_id)
            ->where('role', 'resort_owner')
            ->first();
    }
}
