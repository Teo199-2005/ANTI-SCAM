<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\User;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminClientController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $hasBookings = $request->query('has_bookings');
        $perPage = min(100, max(1, (int) $request->integer('per_page', 25)));

        $revIn = Reservation::revenueEligibleStatusesSqlList();

        $query = User::query()
            ->whereIn('role', ['client', 'user'])
            ->select('users.*')
            ->selectRaw("
                (SELECT COUNT(*) FROM reservations WHERE reservations.client_id = users.id) AS reservation_count,
                (SELECT MAX(reservations.created_at) FROM reservations WHERE reservations.client_id = users.id) AS last_booking_at,
                (SELECT COUNT(DISTINCT reservations.resort_id) FROM reservations WHERE reservations.client_id = users.id) AS resorts_booked,
                (SELECT COALESCE(SUM(reservations.reservation_fee), 0) FROM reservations
                    WHERE reservations.client_id = users.id AND reservations.status IN ({$revIn})) AS total_fees_paid
            ");

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like): void {
                $q->where('users.name', 'like', $like)
                    ->orWhere('users.email', 'like', $like)
                    ->orWhere('users.phone', 'like', $like);
            });
        }

        if ($hasBookings === '1' || $hasBookings === 'true') {
            $query->whereExists(function ($sub): void {
                $sub->selectRaw('1')
                    ->from('reservations')
                    ->whereColumn('reservations.client_id', 'users.id');
            });
        } elseif ($hasBookings === '0' || $hasBookings === 'false') {
            $query->whereNotExists(function ($sub): void {
                $sub->selectRaw('1')
                    ->from('reservations')
                    ->whereColumn('reservations.client_id', 'users.id');
            });
        }

        if ($request->filled('created_from')) {
            $query->whereDate('users.created_at', '>=', $request->query('created_from'));
        }
        if ($request->filled('created_to')) {
            $query->whereDate('users.created_at', '<=', $request->query('created_to'));
        }

        $paginator = $query->orderByDesc('users.created_at')->paginate($perPage);

        $paginator->getCollection()->transform(function (User $user): array {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'created_at' => $user->created_at?->toIso8601String(),
                'reservation_count' => (int) ($user->reservation_count ?? 0),
                'last_booking_at' => $user->last_booking_at,
                'resorts_booked' => (int) ($user->resorts_booked ?? 0),
                'total_fees_paid' => (float) ($user->total_fees_paid ?? 0),
            ];
        });

        return $this->successResponse($paginator, 'Platform clients fetched');
    }

    public function show(User $client)
    {
        if (! in_array($client->role, ['client', 'user'], true)) {
            return $this->errorResponse('Not a platform client account.', null, 404);
        }

        $reservations = Reservation::query()
            ->where('client_id', $client->id)
            ->with(['resort:id,name', 'room:id,name'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return $this->successResponse([
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'phone' => $client->phone,
                'created_at' => $client->created_at?->toIso8601String(),
            ],
            'reservations' => $reservations,
        ], 'Client detail fetched');
    }
}
