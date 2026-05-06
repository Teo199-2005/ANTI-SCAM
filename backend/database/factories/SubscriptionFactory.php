<?php

namespace Database\Factories;

use App\Models\Resort;
use App\Models\Subscription;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Subscription>
 */
class SubscriptionFactory extends Factory
{
    protected $model = Subscription::class;

    public function definition(): array
    {
        $resort = Resort::query()->inRandomOrder()->first() ?? ResortFactory::new()->create();
        $plan = fake()->randomElement(['standard', 'vip']);
        $includedRooms = $plan === 'vip' ? 6 : 3;
        $basePrice = $plan === 'vip' ? 12999 : 4999;
        $extraRoomFee = $plan === 'vip' ? 650 : 950;
        $activeRoomCount = fake()->numberBetween(1, 10);
        $extraRooms = max(0, $activeRoomCount - $includedRooms);
        $total = $basePrice + ($extraRooms * $extraRoomFee);

        $cycleStart = now()->startOfMonth()->subMonths(fake()->numberBetween(0, 2));
        $cycleEnd = (clone $cycleStart)->endOfMonth();
        $nextDue = (clone $cycleEnd)->addDay();
        $status = fake()->randomElement(['active', 'active', 'pending_payment', 'grace_period', 'suspended', 'cancelled']);

        return [
            'tenant_id' => $resort->tenant_id,
            'resort_id' => $resort->id,
            'plan' => $plan,
            'base_price' => $basePrice,
            'included_rooms' => $includedRooms,
            'extra_room_fee' => $extraRoomFee,
            'active_room_count' => $activeRoomCount,
            'total_monthly_fee' => $total,
            'billing_cycle_start' => $cycleStart->toDateString(),
            'billing_cycle_end' => $cycleEnd->toDateString(),
            'next_due_date' => $nextDue->toDateString(),
            'grace_until' => $status === 'grace_period' ? $nextDue->copy()->addDays(7)->toDateString() : null,
            'status' => $status,
        ];
    }
}
