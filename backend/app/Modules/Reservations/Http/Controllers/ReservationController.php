<?php

namespace App\Modules\Reservations\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reservations\Http\Requests\AdminOverrideReservationRequest;
use App\Modules\Reservations\Http\Requests\CancelReservationRequest;
use App\Modules\Reservations\Http\Requests\StoreReservationRequest;
use App\Modules\Reservations\Http\Resources\ReservationResource;
use App\Modules\Reservations\Services\ReservationService;
use App\Models\Reservation;
use App\Shared\Traits\ApiResponseTrait;
use RuntimeException;

class ReservationController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly ReservationService $service) {}

    public function store(StoreReservationRequest $request)
    {
        $this->authorize('create', Reservation::class);

        try {
            $reservation = $this->service->createFromLock([
                ...$request->validated(),
                'client_id' => $request->user()->id,
            ]);
        } catch (RuntimeException $exception) {
            return $this->errorResponse($exception->getMessage(), ['reservation' => ['lock_invalid']], 409);
        }

        $reservation->loadMissing(['resort:id,name,address', 'room:id,name']);

        return $this->successResponse(new ReservationResource($reservation), 'Reservation created', 201);
    }

    public function index()
    {
        $this->authorize('viewAny', Reservation::class);

        $user    = auth()->user();
        $query   = Reservation::withoutGlobalScopes()
            ->with(['resort:id,name,address', 'room:id,name'])
            ->latest();
        $status  = request()->string('status')->value();
        $dateFrom = request()->string('dateFrom')->value();
        $dateTo  = request()->string('dateTo')->value();
        $search  = request()->string('search')->value();
        $perPage = (int) request()->integer('perPage', 10);

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

        if (in_array($user->role, ['client', 'user'], true)) {
            $query->where('client_id', $user->id);
        }

        if (! in_array($user->role, ['admin'], true)) {
            $query->where('tenant_id', $user->tenant_id);
        }

        $reservations = ReservationResource::collection($query->paginate($perPage));

        return $this->successResponse($reservations, 'Reservations fetched');
    }

    public function show(Reservation $reservation)
    {
        $this->authorize('view', $reservation);

        $reservation->loadMissing(['resort:id,name,address', 'room:id,name']);

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

        $reservation->loadMissing(['resort:id,name,address', 'room:id,name']);

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
}
