<?php

namespace App\Modules\Public\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Models\Room;
use App\Models\RoomImage;
use App\Support\StoredMedia;
use Illuminate\Support\Facades\Storage;
use App\Modules\Reservations\Services\ReservationService;
use App\Models\Tenant;
use App\Services\LandingReadinessService;
use App\Services\PhilippineLocationService;
use App\Support\SubscriptionPlan;
use App\Support\YoutubeVideoId;
use App\Services\RoomOccupancyService;
use App\Shared\Traits\ApiResponseTrait;

class PublicCatalogController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly LandingReadinessService $readiness,
        private readonly PhilippineLocationService $locations,
    ) {}

    public function resorts()
    {
        $perPage = min(100, max(6, (int) request()->integer('perPage', 25)));
        $search = request()->string('search')->value();
        $provinceCode = request()->string('province_code')->value();
        $cityCode = request()->string('city_code')->value();
        $planFilter = request()->string('plan')->value();
        $vipOnly = request()->boolean('vip_only');

        $resorts = Resort::query()
            ->with([
                'subscription',
                'tenant:id,subdomain',
                'rooms' => fn ($q) => $q->where('status', 'active')->select('id', 'resort_id'),
            ])
            ->withCount(['rooms as active_rooms_count' => fn ($q) => $q->where('status', 'active')])
            ->where('is_publicly_listed', true)
            ->leftJoin('subscriptions', 'subscriptions.resort_id', '=', 'resorts.id')
            ->orderByRaw("CASE WHEN subscriptions.plan = 'business_pro' AND subscriptions.status IN ('active','grace_period') THEN 1 ELSE 0 END DESC")
            ->orderByDesc('resorts.created_at')
            ->select('resorts.*')
            ->when($provinceCode, fn ($q) => $q->where('address_province_psgc', $provinceCode))
            ->when($cityCode, fn ($q) => $q->where('address_city_municipality_psgc', $cityCode))
            ->when($search, function ($query) use ($search): void {
                $query->where(function ($inner) use ($search): void {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('address_label', 'like', "%{$search}%");
                });
            })
            ->when($vipOnly, fn ($q) => $q->where('resorts.is_vip', true))
            ->when($planFilter === SubscriptionPlan::BUSINESS_PRO, function ($q): void {
                $q->whereHas('subscription', function ($sub): void {
                    $sub->where('plan', SubscriptionPlan::BUSINESS_PRO)
                        ->whereIn('status', ['active', 'grace_period']);
                });
            })
            ->when($planFilter === SubscriptionPlan::STANDARD, function ($q): void {
                $q->where(function ($inner): void {
                    $inner->whereDoesntHave('subscription')
                        ->orWhereHas('subscription', function ($sub): void {
                            $sub->where('plan', '!=', SubscriptionPlan::BUSINESS_PRO)
                                ->orWhereNotIn('status', ['active', 'grace_period']);
                        });
                });
            })
            ->paginate($perPage);

        $pageResortIds = $resorts->getCollection()->pluck('id');
        $minPrices     = Room::withoutGlobalScopes()
            ->whereIn('resort_id', $pageResortIds)
            ->where('status', 'active')
            ->selectRaw('resort_id, MIN(base_price) as min_price')
            ->groupBy('resort_id')
            ->get()
            ->mapWithKeys(fn ($row): array => [(int) $row->resort_id => (float) $row->min_price]);

        $resorts->setCollection($resorts->getCollection()->map(function (Resort $resort) use ($minPrices): array {
            $plan = SubscriptionPlan::normalize($resort->subscription?->plan);
            $isPremium = $plan === SubscriptionPlan::BUSINESS_PRO
                && in_array((string) ($resort->subscription?->status), ['active', 'grace_period'], true);

            $slug = $resort->tenant?->subdomain;
            $slug = is_string($slug) ? trim($slug) : '';
            $slug = $slug !== '' ? $slug : null;

            return [
                'id'               => $resort->id,
                'slug'             => $slug,
                'name'             => $resort->name,
                'description'      => $resort->description,
                'address'          => $this->locations->resortDisplayLine($resort),
                'addressProvincePsgc' => $resort->address_province_psgc,
                'addressCityMunicipalityPsgc' => $resort->address_city_municipality_psgc,
                'addressBarangayPsgc' => $resort->address_barangay_psgc,
                'contactNumber'    => $resort->contact_number,
                'logoUrl'          => $resort->logo_url,
                'backgroundImageUrl' => $resort->background_image_url,
                'plan'             => $plan,
                'badgeLabel'       => $isPremium
                    ? SubscriptionPlan::badgeLabel(SubscriptionPlan::BUSINESS_PRO)
                    : SubscriptionPlan::badgeLabel(SubscriptionPlan::STANDARD),
                'isPremiumVerified' => $isPremium,
                'isVip'            => (bool) $resort->is_vip,
                'activeRoomsCount' => $resort->active_rooms_count,
                'featuredRoomId'   => $resort->rooms->first()?->id,
                'priceFrom'        => $minPrices->get($resort->id),
            ];
        }));

        return $this->successResponse($resorts, 'Public resorts fetched');
    }

    public function resort(int $resort)
    {
        $resort = Resort::withoutGlobalScopes()->findOrFail($resort);

        if (! $resort->is_publicly_listed) {
            abort(404, 'Resort is not publicly listed.');
        }

        $resort->loadMissing('tenant');
        $rooms = $this->roomsForResort($resort);
        $slug = $resort->tenant?->subdomain;
        $slug = is_string($slug) ? trim($slug) : '';
        $slug = $slug !== '' ? $slug : null;

        return $this->successResponse([
            'id'            => $resort->id,
            'slug'          => $slug,
            'tenantId'      => $resort->tenant_id,
            'name'          => $resort->name,
            'description'   => $resort->description,
            'address'       => $this->locations->resortDisplayLine($resort),
            'addressProvincePsgc' => $resort->address_province_psgc,
            'addressCityMunicipalityPsgc' => $resort->address_city_municipality_psgc,
            'addressBarangayPsgc' => $resort->address_barangay_psgc,
            'contactNumber' => $resort->contact_number,
            'logoUrl'       => $resort->logo_url,
            'isVip'         => (bool) $resort->is_vip,
            'map'           => $this->readiness->mapPayloadForResort($resort),
            'rooms'         => $rooms,
        ], 'Resort detail fetched');
    }

    /** Look up a resort by its tenant's subdomain slug (marketing catalog — no subscription gate). */
    public function resortBySlug(string $slug)
    {
        $tenant = Tenant::withoutGlobalScopes()
            ->where('subdomain', $slug)
            ->first();

        if (! $tenant) {
            return $this->errorResponse('Resort not found.', null, 404);
        }

        $resort = Resort::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_publicly_listed', true)
            ->first();

        if (! $resort) {
            return $this->errorResponse('Resort is not publicly listed.', null, 404);
        }

        $rooms = $this->roomsForResort($resort);

        return $this->successResponse([
            'id'            => $resort->id,
            'slug'          => $slug,
            'tenantId'      => $tenant->id,
            'name'          => $resort->name,
            'logoUrl'       => $resort->logo_url,
            'backgroundImageUrl' => $resort->background_image_url,
            'description'   => $resort->description,
            'address'       => $this->locations->resortDisplayLine($resort),
            'addressProvincePsgc' => $resort->address_province_psgc,
            'addressCityMunicipalityPsgc' => $resort->address_city_municipality_psgc,
            'addressBarangayPsgc' => $resort->address_barangay_psgc,
            'contactNumber' => $resort->contact_number,
            'isVip'         => (bool) $resort->is_vip,
            'map'           => $this->readiness->mapPayloadForResort($resort),
            'rooms'         => $rooms,
        ], 'Resort detail by slug fetched');
    }

    /** Subdomain landing page payload — requires complete profile/readiness. */
    public function landingBySlug(string $slug)
    {
        $tenant = Tenant::withoutGlobalScopes()
            ->where('subdomain', $slug)
            ->first();

        if (! $tenant) {
            return $this->errorResponse('Resort not found.', null, 404);
        }

        $resort = Resort::withoutGlobalScopes()
            ->with(['subscription', 'rooms.images'])
            ->where('tenant_id', $tenant->id)
            ->where('is_publicly_listed', true)
            ->first();

        if (! $resort) {
            return $this->errorResponse('Resort is not publicly listed.', null, 404);
        }

        // Check landing readiness
        $check = $this->readiness->check($resort);
        if (! $check['is_ready']) {
            return $this->errorResponse(
                'This resort\'s landing page is not yet fully set up.',
                ['code' => 'landing_incomplete', 'missing_fields' => $check['missing_fields']],
                503
            );
        }

        $owner   = $this->readiness->resolveOwner($resort);
        $payload = $this->readiness->computePayload($resort, $owner);

        $resortAmenities = collect($resort->amenities ?? [])
            ->map(fn ($a) => is_string($a) ? trim($a) : '')
            ->filter()
            ->values()
            ->all();

        $plan = SubscriptionPlan::normalize($resort->subscription?->plan);
        $isPremium = $plan === SubscriptionPlan::BUSINESS_PRO
            && in_array((string) ($resort->subscription?->status), ['active', 'grace_period'], true);

        $embedVideoId = null;
        if ($isPremium && $resort->admin_landing_embed_enabled) {
            $embedVideoId = YoutubeVideoId::parse($resort->admin_landing_youtube_url);
        }

        return $this->successResponse([
            'id'                   => $resort->id,
            'slug'                 => $slug,
            'tenantId'             => $tenant->id,
            'name'                 => $resort->name,
            'description'          => $resort->description,
            'address'              => $this->locations->resortDisplayLine($resort),
            'addressProvincePsgc' => $resort->address_province_psgc,
            'addressCityMunicipalityPsgc' => $resort->address_city_municipality_psgc,
            'addressBarangayPsgc' => $resort->address_barangay_psgc,
            'contactNumber'        => $resort->contact_number,
            'logoUrl'              => $resort->logo_url,
            'plan'                 => $plan,
            'badgeLabel'           => $isPremium
                ? SubscriptionPlan::badgeLabel(SubscriptionPlan::BUSINESS_PRO)
                : SubscriptionPlan::badgeLabel(SubscriptionPlan::STANDARD),
            'isPremiumVerified'    => $isPremium,
            'isVip'                => $isPremium,
            'amenities'            => $resortAmenities,
            'cancellationPolicy'   => $resort->cancellation_policy,
            'hero'                 => $payload['hero'],
            'about'                => $payload['about'],
            'rooms'                => $payload['rooms'],
            'gallery'              => $payload['gallery'],
            'footer'               => $payload['footer'],
            'map'                  => $payload['map'],
            'adminLandingEmbed'    => [
                'enabled' => (bool) $resort->admin_landing_embed_enabled && $embedVideoId !== null,
                'youtubeVideoId' => $embedVideoId,
            ],
        ], 'Resort landing page fetched');
    }

    public function checkAvailability(Room $room)
    {
        if ($guard = $this->validateRoomPublicBookable($room)) {
            return $guard;
        }

        $checkIn  = request()->string('check_in_date')->value();
        $checkOut = request()->string('check_out_date')->value();

        if (! $checkIn || ! $checkOut) {
            return $this->errorResponse('check_in_date and check_out_date are required.', null, 422);
        }

        $tenantId = (int) $room->tenant_id;
        $units = max(1, (int) ($room->units ?? 1));

        $resCount = RoomOccupancyService::overlappingReservationCount($tenantId, (int) $room->id, $checkIn, $checkOut);
        $lockCount = RoomOccupancyService::overlappingActiveLockCount($tenantId, (int) $room->id, $checkIn, $checkOut);
        $hasBlock = RoomOccupancyService::hasBlockedAvailabilityWindow((int) $room->id, $checkIn, $checkOut);

        $isAvailable = ! $hasBlock && ($resCount + $lockCount) < $units;

        return $this->successResponse([
            'available'      => $isAvailable,
            'check_in_date'  => $checkIn,
            'check_out_date' => $checkOut,
        ], $isAvailable ? 'Room is available' : 'Room is not available for selected dates');
    }

    /**
     * Month heatmap: for each future day, whether a one-night stay may start that night.
     *
     * @return array{year:int,month:int,days:array<string, 'past'|'free'|'busy'>}
     */
    public function availabilityCalendar(Room $room)
    {
        if ($guard = $this->validateRoomPublicBookable($room)) {
            return $guard;
        }

        $year = (int) request()->integer('year', (int) now()->format('Y'));
        $month = (int) request()->integer('month', (int) now()->format('n'));
        if ($month < 1 || $month > 12) {
            return $this->errorResponse('Invalid month.', null, 422);
        }

        $tenantId = (int) $room->tenant_id;
        $units = max(1, (int) ($room->units ?? 1));

        $days = RoomOccupancyService::buildMonthOneNightStartMap(
            $tenantId,
            (int) $room->id,
            $year,
            $month,
            $units,
        );

        return $this->successResponse([
            'year' => $year,
            'month' => $month,
            'days' => $days,
        ], 'Room availability calendar fetched');
    }

    /** Stream room image bytes for public landing / catalog (no auth). */
    public function roomImageFile(Room $room, RoomImage $image)
    {
        if ($guard = $this->validateRoomPublicBookable($room)) {
            return $guard;
        }

        if ($image->room_id !== $room->id) {
            abort(404, 'Image not found for this room.');
        }

        return StoredMedia::httpResponseForStoredFile($image->disk, $image->path);
    }

    public function room(Room $room)
    {
        if ($guard = $this->validateRoomPublicBookable($room)) {
            return $guard;
        }

        $room->load(['resort', 'images']);

        $images = $room->images
            ->sortBy(fn ($img): array => [($img->is_primary ? 0 : 1), (int) $img->sort_order])
            ->map(fn ($img) => $img->toPublicArray())
            ->filter()
            ->values()
            ->all();

        return $this->successResponse([
            'id'             => $room->id,
            'name'           => $room->name,
            'code'           => $room->code,
            'capacity'       => $room->capacity,
            'units'          => max(1, (int) ($room->units ?? 1)),
            'basePrice'      => $room->base_price,
            'reservationFee' => ReservationService::reservationFeeAmount(),
            'amenities'      => $room->amenities ?? [],
            'rules'          => $room->rules,
            'images'         => $images,
            'resort'         => [
                'id'            => $room->resort?->id,
                'name'          => $room->resort?->name,
                'address'       => $room->resort ? $this->locations->resortDisplayLine($room->resort) : null,
                'description'   => $room->resort?->description,
                'contactNumber' => $room->resort?->contact_number,
            ],
        ], 'Public room fetched');
    }

    // ---------- helpers ----------

    private function roomsForResort(Resort $resort): \Illuminate\Support\Collection
    {
        return Room::withoutGlobalScopes()
            ->where('resort_id', $resort->id)
            ->where('status', 'active')
            ->with('images')
            ->get()
            ->map(function (Room $room): array {
                $images = $room->images
                    ->sortBy(fn ($img): array => [($img->is_primary ? 0 : 1), (int) $img->sort_order])
                    ->map(fn ($img) => $img->toPublicArray())
                    ->filter()
                    ->values()
                    ->all();

                return [
                    'id'        => $room->id,
                    'name'      => $room->name,
                    'code'      => $room->code,
                    'capacity'  => $room->capacity,
                    'units'     => max(1, (int) ($room->units ?? 1)),
                    'basePrice' => $room->base_price,
                    'amenities' => $room->amenities ?? [],
                    'rules'     => $room->rules,
                    'images'    => $images,
                    'status'    => $room->status,
                ];
            });
    }

    private function validateRoomPublicBookable(Room $room): ?\Illuminate\Http\JsonResponse
    {
        if ($room->status !== 'active') {
            return $this->errorResponse('Room is not publicly available', ['room' => ['not_publicly_available']], 404);
        }

        $resort = Resort::withoutGlobalScopes()
            ->with('subscription')
            ->find($room->resort_id);
        if (! $resort || ! $resort->is_publicly_listed) {
            return $this->errorResponse('Resort is not publicly listed.', ['room' => ['not_publicly_available']], 404);
        }

        if (! $resort->subscription || ! in_array($resort->subscription->status, ['active', 'grace_period'], true)) {
            return $this->errorResponse('Resort subscription is not active.', ['room' => ['subscription_inactive']], 403);
        }

        return null;
    }
}
