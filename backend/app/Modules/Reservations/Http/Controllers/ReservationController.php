<?php

namespace App\Modules\Reservations\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Services\BookingPaymentReconciliationService;
use App\Modules\Reservations\Http\Requests\AdminOverrideReservationRequest;
use App\Modules\Reservations\Http\Requests\CancelReservationRequest;
use App\Modules\Reservations\Http\Requests\StoreReservationRequest;
use App\Modules\Reservations\Http\Resources\ReservationResource;
use App\Modules\Reservations\Services\ReservationService;
use App\Models\Reservation;
use App\Support\SafeSort;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ReservationController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly ReservationService $service,
        private readonly BookingPaymentReconciliationService $bookingPaymentReconciliation,
    ) {}

    public function store(StoreReservationRequest $request)
    {
        $this->authorize('create', Reservation::class);

        $user = $request->user();
        if ($user->role === 'guest') {
            if (! $user->home_resort_id) {
                throw ValidationException::withMessages([
                    'resort_id' => ['Guest account is not linked to a resort.'],
                ]);
            }
            if ((int) $user->home_resort_id !== (int) $request->input('resort_id')) {
                throw ValidationException::withMessages([
                    'resort_id' => ['You can only book your home resort.'],
                ]);
            }
        }

        try {
            $reservation = $this->service->createFromLock([
                ...$request->validated(),
                'client_id' => $request->user()->id,
            ]);
        } catch (RuntimeException $exception) {
            return $this->errorResponse($exception->getMessage(), ['reservation' => ['lock_invalid']], 409);
        }

        $reservation->loadMissing(['resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc', 'room:id,name']);

        return $this->successResponse(new ReservationResource($reservation), 'Reservation created', 201);
    }

    public function index()
    {
        $this->authorize('viewAny', Reservation::class);

        $user = auth()->user();
        $this->bookingPaymentReconciliation->syncPendingInvoicePaymentsForBooker($user);

        $query   = Reservation::withoutGlobalScopes()
            ->with(['resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc', 'room:id,name']);
        $status  = request()->string('status')->value();
        $dateFrom = request()->string('dateFrom')->value();
        $dateTo  = request()->string('dateTo')->value();
        $search  = request()->string('search')->value();
        $perPage = (int) request()->integer('perPage', 10);
        $sortBy  = request()->string('sort_by')->value();
        $sortDir = request()->string('sort_dir')->value();

        if ($status) {
            $query->where('status', $status);
        }

        if ($dateFrom) {
            $query->whereDate('check_in_date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('check_out_date', '<=', $dateTo);
        }

        if ($search) {
            $query->where(function ($inner) use ($search): void {
                $inner->where('reference_no', 'like', "%{$search}%")
                    ->orWhere('xendit_invoice_id', 'like', "%{$search}%");
            });
        }

        if (in_array($user->role, ['client', 'user', 'guest'], true)) {
            $query->where('client_id', $user->id);
        }

        if ($user->role === 'guest') {
            $query->where('resort_id', $user->home_resort_id);
        } elseif (! in_array($user->role, ['admin'], true)) {
            $query->where('tenant_id', $user->tenant_id);
        }

        SafeSort::apply(
            $query,
            $sortBy,
            $sortDir,
            ['reference_no', 'status', 'check_in_date', 'check_out_date', 'created_at', 'guest_count', 'total_amount'],
            'created_at',
            'desc'
        );

        $reservations = ReservationResource::collection($query->paginate($perPage));

        return $this->successResponse($reservations, 'Reservations fetched');
    }

    public function show(Reservation $reservation)
    {
        $this->authorize('view', $reservation);

        $reservation->loadMissing(['resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc', 'room:id,name']);

        return $this->successResponse(new ReservationResource($reservation), 'Reservation details');
    }

    public function cancel(Reservation $reservation, CancelReservationRequest $request)
    {
        try {
            $reservation = $this->service->cancelByClient(
                $reservation,
                $request->user()->id,
                $request->validated('reason')
            );
        } catch (RuntimeException $exception) {
            return $this->errorResponse($exception->getMessage(), ['reservation' => ['cannot_cancel']], 409);
        }

        $reservation->loadMissing(['resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc', 'room:id,name']);

        return $this->successResponse(new ReservationResource($reservation), 'Reservation cancelled');
    }

    public function adminOverride(Reservation $reservation, AdminOverrideReservationRequest $request)
    {
        $validated = $request->validated();

        try {
            $reservation = $this->service->adminOverrideStatus(
                $reservation,
                $validated['status'],
                $validated['reason']
            );
        } catch (RuntimeException $exception) {
            return $this->errorResponse($exception->getMessage(), ['reservation' => ['override_failed']], 409);
        }

        return $this->successResponse(new ReservationResource($reservation), 'Reservation override applied');
    }

    public function markCompletedByResort(Reservation $reservation)
    {
        $this->authorize('updateResortLifecycle', $reservation);

        try {
            $reservation = $this->service->markCompletedByResort($reservation);
        } catch (RuntimeException $exception) {
            return $this->errorResponse($exception->getMessage(), ['reservation' => ['cannot_complete']], 409);
        }

        $reservation->loadMissing(['resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc', 'room:id,name']);

        return $this->successResponse(new ReservationResource($reservation), 'Reservation marked completed.');
    }

    public function markNoShowByResort(Reservation $reservation)
    {
        $this->authorize('updateResortLifecycle', $reservation);

        try {
            $reservation = $this->service->markNoShowByResort($reservation);
        } catch (RuntimeException $exception) {
            return $this->errorResponse($exception->getMessage(), ['reservation' => ['cannot_no_show']], 409);
        }

        $reservation->loadMissing(['resort:id,name,address_label,address_province_psgc,address_city_municipality_psgc,address_barangay_psgc', 'room:id,name']);

        return $this->successResponse(new ReservationResource($reservation), 'Reservation marked as no-show.');
    }
}
