<?php

namespace Database\Factories;

use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Reservation>
 */
class ReservationFactory extends Factory
{
    protected $model = Reservation::class;

    public function definition(): array
    {
        $room = Room::query()->inRandomOrder()->with('resort')->first() ?? RoomFactory::new()->create();
        $client = User::query()->whereIn('role', ['client', 'user'])->inRandomOrder()->first()
            ?? UserFactory::new()->create(['role' => 'client', 'tenant_id' => $room->tenant_id]);

        $checkIn = now()->addDays(fake()->numberBetween(-20, 40));
        $nights = fake()->numberBetween(1, 5);
        $checkOut = (clone $checkIn)->addDays($nights);

        $status = fake()->randomElement(['pending_payment', 'confirmed', 'cancelled', 'expired']);
        $fee = 500;
        $total = ((float) $room->base_price * $nights);
        $paymentStatus = match ($status) {
            'confirmed' => 'paid',
            'expired' => 'expired',
            'cancelled' => fake()->randomElement(['failed', 'expired']),
            default => 'pending',
        };

        $cancelledAt = $status === 'cancelled' ? now()->subDays(fake()->numberBetween(1, 7)) : null;
        $cancelReason = $status === 'cancelled' ? fake()->sentence(7) : null;
        $refundStatus = $status === 'cancelled' ? 'non_refundable_fee_retained' : 'none';

        return [
            'tenant_id' => $room->tenant_id,
            'resort_id' => $room->resort_id,
            'room_id' => $room->id,
            'client_id' => $client->id,
            'reference_no' => 'RS-'.strtoupper(Str::random(8)),
            'check_in_date' => $checkIn->toDateString(),
            'check_out_date' => $checkOut->toDateString(),
            'guest_count' => fake()->numberBetween(1, max(1, (int) $room->capacity)),
            'reservation_fee' => $fee,
            'total_amount' => $total,
            'status' => $status,
            'xendit_invoice_id' => 'inv_'.Str::lower(Str::random(10)),
            'xendit_payment_status' => $paymentStatus,
            'reserved_at' => now()->subDays(fake()->numberBetween(1, 30)),
            'cancelled_at' => $cancelledAt,
            'cancellation_reason' => $cancelReason,
            'refund_status' => $refundStatus,
        ];
    }
}
