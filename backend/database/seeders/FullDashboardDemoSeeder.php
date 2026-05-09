<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\BookingLock;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\RoomAvailability;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class FullDashboardDemoSeeder extends Seeder
{
    public function run(): void
    {
        $faker = fake();
        $faker->seed(20260423);

        // Fixed role fixtures for login
        $admin = User::query()->create([
            'tenant_id' => null,
            'name' => 'Platform Admin',
            'email' => 'admin@resort.test',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        // Create medium tenant/resort set (~12)
        $tenants = collect();
        $resorts = collect();
        $rooms = collect();

        for ($i = 1; $i <= 12; $i++) {
            $tenant = Tenant::query()->create([
                'name' => "Tenant {$i} Hospitality",
                'slug' => "tenant-{$i}-hospitality",
                'subdomain' => "tenant{$i}",
                'status' => $i % 9 === 0 ? 'suspended' : 'active',
            ]);
            $tenants->push($tenant);

            $owner = User::query()->create([
                'tenant_id' => $tenant->id,
                'name' => "Resort Owner {$i}",
                'email' => "owner{$i}@resort.test",
                'password' => Hash::make('password'),
                'role' => 'resort_owner',
                'email_verified_at' => now(),
            ]);

            $resort = Resort::query()->create([
                'tenant_id' => $tenant->id,
                'name' => fake()->randomElement(['Azure Sands', 'Coral Bay', 'Luna Ridge', 'Palm Crest'])." {$i}",
                'description' => $faker->sentence(14),
                'address' => $faker->streetAddress().', '.$faker->city(),
                'contact_number' => '+63 9'.$faker->numerify('#########'),
                'is_publicly_listed' => $i % 5 !== 0,
            ]);
            $resorts->push($resort);

            $roomCount = $faker->numberBetween(5, 9);
            for ($r = 1; $r <= $roomCount; $r++) {
                $room = Room::query()->create([
                    'tenant_id' => $tenant->id,
                    'resort_id' => $resort->id,
                    'name' => $faker->randomElement(['Deluxe Suite', 'Ocean View', 'Family Loft', 'Garden Villa'])." {$r}",
                    'code' => "R{$resort->id}-{$r}",
                    'capacity' => $faker->numberBetween(2, 8),
                    'base_price' => $faker->randomFloat(2, 1800, 12000),
                    'amenities' => $faker->randomElements(['WiFi', 'TV', 'Balcony', 'Breakfast', 'Mini Bar', 'Pool Access'], $faker->numberBetween(2, 5)),
                    'rules' => $faker->sentence(9),
                    'status' => $faker->randomElement(['active', 'active', 'inactive']),
                ]);
                $rooms->push($room);
            }

            $plan = $i % 4 === 0 ? 'vip' : 'basic';
            $includedRooms = $plan === 'vip' ? 6 : 3;
            $basePrice = $plan === 'vip' ? 12999 : 4999;
            $extraRoomFee = $plan === 'vip' ? 650 : 950;
            $activeRoomCount = Room::query()
                ->where('tenant_id', $tenant->id)
                ->where('resort_id', $resort->id)
                ->where('status', 'active')
                ->count();
            $extraRooms = max(0, $activeRoomCount - $includedRooms);
            $totalFee = $basePrice + ($extraRooms * $extraRoomFee);
            $status = $faker->randomElement(['active', 'active', 'pending_payment', 'grace_period', 'suspended', 'cancelled']);
            $cycleStart = Carbon::now()->startOfMonth()->subMonths($faker->numberBetween(0, 2));
            $cycleEnd = (clone $cycleStart)->endOfMonth();
            $nextDue = (clone $cycleEnd)->addDay();

            Subscription::query()->create([
                'tenant_id' => $tenant->id,
                'resort_id' => $resort->id,
                'plan' => $plan,
                'base_price' => $basePrice,
                'included_rooms' => $includedRooms,
                'extra_room_fee' => $extraRoomFee,
                'active_room_count' => $activeRoomCount,
                'total_monthly_fee' => $totalFee,
                'billing_cycle_start' => $cycleStart->toDateString(),
                'billing_cycle_end' => $cycleEnd->toDateString(),
                'next_due_date' => $nextDue->toDateString(),
                'grace_until' => $status === 'grace_period' ? $nextDue->copy()->addDays(7)->toDateString() : null,
                'status' => $status,
            ]);

            // Availability ranges for calendar page
            $tenantRooms = $rooms->where('tenant_id', $tenant->id)->values();
            foreach ($tenantRooms as $room) {
                $availabilityRows = $faker->numberBetween(2, 4);
                for ($a = 0; $a < $availabilityRows; $a++) {
                    $start = Carbon::now()->addDays($faker->numberBetween(-14, 45));
                    $end = (clone $start)->addDays($faker->numberBetween(1, 4));
                    $availabilityStatus = $faker->randomElement(['blocked', 'maintenance', 'available']);
                    RoomAvailability::query()->create([
                        'tenant_id' => $tenant->id,
                        'room_id' => $room->id,
                        'start_date' => $start->toDateString(),
                        'end_date' => $end->toDateString(),
                        'status' => $availabilityStatus,
                        'reason' => $availabilityStatus === 'available' ? null : $faker->sentence(6),
                    ]);
                }
            }
        }

        // Client + user accounts (~46) + fixed quick login fixtures
        User::query()->create([
            'tenant_id' => $tenants->first()?->id,
            'name' => 'Guest User',
            'email' => 'guest@resort.test',
            'password' => Hash::make('password'),
            'role' => 'client',
            'email_verified_at' => now(),
        ]);

        User::query()->create([
            'tenant_id' => $tenants->first()?->id,
            'name' => 'Demo User',
            'email' => 'user@resort.test',
            'password' => Hash::make('password'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        for ($i = 1; $i <= 30; $i++) {
            User::query()->create([
                'tenant_id' => $tenants->random()->id,
                'name' => "Client {$i}",
                'email' => "client{$i}@resort.test",
                'password' => Hash::make('password'),
                'role' => 'client',
                'email_verified_at' => now(),
            ]);
        }

        for ($i = 1; $i <= 15; $i++) {
            User::query()->create([
                'tenant_id' => $tenants->random()->id,
                'name' => "User {$i}",
                'email' => "user{$i}@resort.test",
                'password' => Hash::make('password'),
                'role' => 'user',
                'email_verified_at' => now(),
            ]);
        }

        $clientUsers = User::query()->whereIn('role', ['client', 'user'])->get();

        // Reservations (~250) with full status spread allowed by schema
        for ($i = 1; $i <= 250; $i++) {
            /** @var Room $room */
            $room = $rooms->random();
            $client = $clientUsers->random();
            $checkIn = Carbon::now()->addDays($faker->numberBetween(-20, 40));
            $nights = $faker->numberBetween(1, 5);
            $checkOut = (clone $checkIn)->addDays($nights);
            $status = $faker->randomElement([
                'pending_payment', 'pending_payment', 'pending_payment',
                'confirmed', 'confirmed', 'confirmed',
                'cancelled', 'expired',
            ]);

            $xenditStatus = match ($status) {
                'confirmed' => 'paid',
                'expired' => 'expired',
                'cancelled' => $faker->randomElement(['failed', 'expired']),
                default => 'pending',
            };

            $cancelledAt = $status === 'cancelled' ? now()->subDays($faker->numberBetween(1, 10)) : null;
            $cancelReason = $status === 'cancelled' ? $faker->sentence(8) : null;
            $refundStatus = $status === 'cancelled' ? 'non_refundable_fee_retained' : 'none';

            Reservation::query()->create([
                'tenant_id' => $room->tenant_id,
                'resort_id' => $room->resort_id,
                'room_id' => $room->id,
                'client_id' => $client->id,
                'reference_no' => 'RS-'.strtoupper(Str::random(8)),
                'check_in_date' => $checkIn->toDateString(),
                'check_out_date' => $checkOut->toDateString(),
                'guest_count' => $faker->numberBetween(1, max(1, (int) $room->capacity)),
                'reservation_fee' => 500,
                'total_amount' => ((float) $room->base_price * $nights),
                'status' => $status,
                'xendit_invoice_id' => 'inv_'.Str::lower(Str::random(10)),
                'xendit_payment_status' => $xenditStatus,
                'reserved_at' => now()->subDays($faker->numberBetween(1, 30)),
                'cancelled_at' => $cancelledAt,
                'cancellation_reason' => $cancelReason,
                'refund_status' => $refundStatus,
            ]);
        }

        // Guaranteed tenant/client records so demo login accounts always see populated pages
        $primaryTenant = $tenants->first();
        $primaryRoom = $rooms->firstWhere('tenant_id', $primaryTenant?->id);
        $guestUser = User::query()->where('email', 'guest@resort.test')->first();
        $demoUser = User::query()->where('email', 'user@resort.test')->first();

        if ($primaryTenant && $primaryRoom && $guestUser && $demoUser) {
            foreach ([
                ['user' => $guestUser, 'status' => 'confirmed', 'days' => 3],
                ['user' => $guestUser, 'status' => 'pending_payment', 'days' => 10],
                ['user' => $guestUser, 'status' => 'cancelled', 'days' => -6],
                ['user' => $guestUser, 'status' => 'expired', 'days' => -2],
                ['user' => $demoUser, 'status' => 'confirmed', 'days' => 8],
                ['user' => $demoUser, 'status' => 'pending_payment', 'days' => 14],
                ['user' => $demoUser, 'status' => 'cancelled', 'days' => -10],
                ['user' => $demoUser, 'status' => 'expired', 'days' => -4],
            ] as $idx => $preset) {
                $checkIn = now()->addDays($preset['days']);
                $checkOut = (clone $checkIn)->addDays(2);
                $isCancelled = $preset['status'] === 'cancelled';

                Reservation::query()->create([
                    'tenant_id' => $primaryTenant->id,
                    'resort_id' => $primaryRoom->resort_id,
                    'room_id' => $primaryRoom->id,
                    'client_id' => $preset['user']->id,
                    'reference_no' => 'RS-DEMO-'.str_pad((string) ($idx + 1), 4, '0', STR_PAD_LEFT),
                    'check_in_date' => $checkIn->toDateString(),
                    'check_out_date' => $checkOut->toDateString(),
                    'guest_count' => 2,
                    'reservation_fee' => 500,
                    'total_amount' => ((float) $primaryRoom->base_price * 2),
                    'status' => $preset['status'],
                    'xendit_invoice_id' => 'inv_demo_'.Str::lower(Str::random(8)),
                    'xendit_payment_status' => match ($preset['status']) {
                        'confirmed' => 'paid',
                        'expired' => 'expired',
                        'cancelled' => 'failed',
                        default => 'pending',
                    },
                    'reserved_at' => now()->subDays(3),
                    'cancelled_at' => $isCancelled ? now()->subDays(1) : null,
                    'cancellation_reason' => $isCancelled ? 'Demo cancellation case' : null,
                    'refund_status' => $isCancelled ? 'non_refundable_fee_retained' : 'none',
                ]);
            }
        }

        // Booking locks for resort dashboard locked widget
        for ($i = 1; $i <= 85; $i++) {
            /** @var Room $room */
            $room = $rooms->random();
            $checkIn = now()->addDays($faker->numberBetween(0, 15));
            BookingLock::query()->create([
                'tenant_id' => $room->tenant_id,
                'room_id' => $room->id,
                'lock_token' => (string) Str::uuid(),
                'check_in_date' => $checkIn->toDateString(),
                'check_out_date' => $checkIn->copy()->addDays($faker->numberBetween(1, 4))->toDateString(),
                'expires_at' => now()->addMinutes($faker->numberBetween(5, 30)),
                'status' => $faker->randomElement(['locked', 'locked', 'released', 'converted']),
            ]);
        }

        // Audit logs (~400) for admin audit page
        $allUsers = User::query()->get();
        $actions = ['created', 'updated', 'deleted', 'status_override', 'refresh', 'login'];
        $entities = ['reservation', 'room', 'resort', 'subscription', 'booking_lock', 'user'];
        for ($i = 1; $i <= 400; $i++) {
            $tenant = $tenants->random();
            $user = $faker->boolean(85) ? $allUsers->random() : null;
            AuditLog::query()->create([
                'tenant_id' => $faker->boolean(90) ? $tenant->id : null,
                'user_id' => $user?->id,
                'action' => $faker->randomElement($actions),
                'entity_type' => $faker->randomElement($entities),
                'entity_id' => $faker->numberBetween(1, 5000),
                'old_values' => $faker->boolean(45) ? ['status' => 'pending_payment'] : null,
                'new_values' => $faker->boolean(65) ? ['status' => 'confirmed'] : null,
                'metadata' => ['ip' => $faker->ipv4(), 'source' => 'seeder'],
                'created_at' => now()->subDays($faker->numberBetween(0, 30)),
                'updated_at' => now(),
            ]);
        }

        // Demo marketer lives in MarketingPartnerDemoSeeder (idempotent; run via DatabaseSeeder after this).

        // Keep one known owner login mapped to first tenant for quick role testing
        User::query()->create([
            'tenant_id' => $tenants->first()?->id,
            'name' => 'Resort Owner',
            'email' => 'owner@resort.test',
            'password' => Hash::make('password'),
            'role' => 'resort_owner',
            'email_verified_at' => now(),
        ]);

        // Log a seed marker audit row (admin context)
        AuditLog::query()->create([
            'tenant_id' => null,
            'user_id' => $admin->id,
            'action' => 'seed_completed',
            'entity_type' => 'system',
            'entity_id' => null,
            'old_values' => null,
            'new_values' => ['profile' => 'medium'],
            'metadata' => ['seed' => static::class],
        ]);
    }
}
