<?php

namespace App\Modules\Guests\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\GuestFavoriteRoom;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\User;
use App\Modules\Billing\Services\BookingPaymentReconciliationService;
use App\Modules\Reservations\Http\Resources\ReservationResource;
use App\Modules\Reservations\Services\ReservationService;
use App\Services\PhilippineLocationService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class GuestPortalController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly PhilippineLocationService $locations,
        private readonly BookingPaymentReconciliationService $bookingPaymentReconciliation,
    ) {}

    private function assertGuest(Request $request): User
    {
        $user = $request->user();
        if (! $user || $user->role !== 'guest' || ! $user->home_resort_id) {
            abort(Response::HTTP_FORBIDDEN, 'Guest home resort is not configured.');
        }

        return $user;
    }

    public function resort(Request $request)
    {
        $user = $this->assertGuest($request);
        $resort = Resort::withoutGlobalScopes()
            ->with(['tenant:id,subdomain'])
            ->where('id', $user->home_resort_id)
            ->where('is_publicly_listed', true)
            ->firstOrFail();

        $slug = (string) ($resort->tenant?->subdomain ?? '');

        return $this->successResponse([
            'id' => $resort->id,
            'name' => $resort->name,
            'slug' => $slug,
            'logoUrl' => $resort->logo_url,
            'address' => $this->locations->resortDisplayLine($resort),
            'contactNumber' => $resort->contact_number,
            'description' => $resort->description,
        ], 'Home resort');
    }

    public function rooms(Request $request)
    {
        $user = $this->assertGuest($request);
        $rooms = Room::withoutGlobalScopes()
            ->with('images')
            ->where('resort_id', $user->home_resort_id)
            ->where('status', 'active')
            ->get()
            ->map(function (Room $room): array {
                $imageUrls = $room->images
                    ->sortBy(fn ($img): array => [($img->is_primary ? 0 : 1), (int) $img->sort_order])
                    ->map(fn ($img) => $img->toPublicArray())
                    ->filter()
                    ->values()
                    ->all();

                return [
                    'id' => $room->id,
                    'name' => $room->name,
                    'code' => $room->code,
                    'capacity' => $room->capacity,
                    'units' => max(1, (int) ($room->units ?? 1)),
                    'basePrice' => $room->base_price,
                    'amenities' => $room->amenities ?? [],
                    'rules' => $room->rules,
                    'images' => $imageUrls,
                    'status' => $room->status,
                    'reservationFee' => ReservationService::reservationFeeAmount(),
                ];
            });

        return $this->successResponse($rooms, 'Rooms fetched');
    }

    public function reservations(Request $request)
    {
        $user = $this->assertGuest($request);
        $this->bookingPaymentReconciliation->syncPendingInvoicePaymentsForBooker($user);

        $when = $request->string('when')->value() ?: 'upcoming';
        $today = now()->toDateString();

        $query = Reservation::withoutGlobalScopes()
            ->with(['resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc', 'room:id,name'])
            ->where('client_id', $user->id)
            ->where('resort_id', $user->home_resort_id);

        if ($when === 'past') {
            $query->whereDate('check_out_date', '<', $today);
        } else {
            $query->whereDate('check_out_date', '>=', $today);
        }

        $perPage = min(50, max(1, (int) $request->integer('perPage', 15)));
        $paginator = $query->orderByDesc('check_in_date')->paginate($perPage);
        $resource = ReservationResource::collection($paginator);

        return response()->json([
            'success' => true,
            'message' => 'Reservations fetched',
            'data' => $resource->response()->getData(true),
            'errors' => null,
        ]);
    }

    public function favoritesIndex(Request $request)
    {
        $user = $this->assertGuest($request);
        $ids = GuestFavoriteRoom::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->pluck('room_id');

        if ($ids->isEmpty()) {
            return $this->successResponse([], 'Favorites fetched');
        }

        $rooms = Room::withoutGlobalScopes()
            ->whereIn('id', $ids)
            ->where('resort_id', $user->home_resort_id)
            ->where('status', 'active')
            ->get()
            ->sortBy(fn (Room $room): int => (int) $ids->search($room->id))
            ->values()
            ->map(fn (Room $room): array => [
                'id' => $room->id,
                'name' => $room->name,
                'code' => $room->code,
                'capacity' => $room->capacity,
                'basePrice' => $room->base_price,
            ]);

        return $this->successResponse($rooms, 'Favorites fetched');
    }

    public function favoritesStore(Request $request)
    {
        $user = $this->assertGuest($request);
        $validated = $request->validate([
            'room_id' => ['required', 'integer'],
        ]);
        $room = Room::withoutGlobalScopes()
            ->whereKey($validated['room_id'])
            ->where('resort_id', $user->home_resort_id)
            ->where('status', 'active')
            ->firstOrFail();

        GuestFavoriteRoom::query()->firstOrCreate([
            'user_id' => $user->id,
            'room_id' => $room->id,
        ]);

        return $this->successResponse(['roomId' => $room->id], 'Favorite saved', 201);
    }

    public function favoritesDestroy(Request $request, int $roomId)
    {
        $user = $this->assertGuest($request);
        $room = Room::withoutGlobalScopes()
            ->whereKey($roomId)
            ->where('resort_id', $user->home_resort_id)
            ->firstOrFail();

        GuestFavoriteRoom::query()
            ->where('user_id', $user->id)
            ->where('room_id', $room->id)
            ->delete();

        return $this->successResponse(null, 'Favorite removed');
    }
}
