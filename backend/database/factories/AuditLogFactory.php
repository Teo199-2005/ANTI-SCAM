<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    protected $model = AuditLog::class;

    public function definition(): array
    {
        $tenant = Tenant::query()->inRandomOrder()->first();
        $user = User::query()->inRandomOrder()->first();
        $entity = fake()->randomElement(['reservation', 'room', 'resort', 'subscription', 'booking_lock', 'user']);
        $action = fake()->randomElement(['created', 'updated', 'deleted', 'status_override', 'login', 'refresh']);

        return [
            'tenant_id' => $tenant?->id,
            'user_id' => fake()->boolean(80) ? $user?->id : null,
            'action' => $action,
            'entity_type' => $entity,
            'entity_id' => fake()->numberBetween(1, 9999),
            'old_values' => fake()->boolean(40) ? ['status' => 'pending_payment'] : null,
            'new_values' => fake()->boolean(60) ? ['status' => 'confirmed'] : null,
            'metadata' => ['ip' => fake()->ipv4(), 'note' => fake()->sentence(4)],
        ];
    }
}
