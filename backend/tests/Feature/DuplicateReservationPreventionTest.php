<?php

namespace Tests\Feature;

use App\Models\BookingLock;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Reservations\Services\ReservationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DuplicateReservationPreventionTest extends TestCase
{
    use RefreshDatabase;

    public function test_second_reservation_for_same_guest_dates_reuses_pending_row(): void
    {
        $tenant = Tenant::create([
            'name' => 'Dup Tenant',
            'slug' => 'dup-tenant',
            'subdomain' => 'dup',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Dup Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Dup Room',
            'code' => 'D1',
            'status' => 'active',
            'base_price' => 100,
            'capacity' => 2,
            'units' => 1,
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'guest',
            'home_resort_id' => $resort->id,
        ]);
        Sanctum::actingAs($user);

        $checkIn = now()->addDays(5)->toDateString();
        $checkOut = now()->addDays(6)->toDateString();

        $lock1 = $this->postJson('/api/v1/booking-locks', [
            'room_id' => $room->id,
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
        ])->assertCreated()->json('data.lock_token');

        $first = $this->postJson('/api/v1/reservations', [
            'resort_id' => $resort->id,
            'lock_token' => $lock1,
            'guest_count' => 1,
            'total_amount' => 100,
        ])->assertCreated()->json('data.id');

        // Simulate a second lock row (e.g. race before the first reservation committed).
        $lock2 = BookingLock::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'room_id' => $room->id,
            'lock_token' => (string) \Illuminate\Support\Str::uuid(),
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'expires_at' => now()->addMinutes(10),
            'status' => 'locked',
        ])->lock_token;

        $second = $this->postJson('/api/v1/reservations', [
            'resort_id' => $resort->id,
            'lock_token' => $lock2,
            'guest_count' => 1,
            'total_amount' => 100,
        ])->assertCreated()->json('data.id');

        $this->assertSame((int) $first, (int) $second);
        $this->assertSame(1, Reservation::withoutGlobalScopes()->where('room_id', $room->id)->count());
    }

    public function test_second_guest_cannot_create_pending_when_stay_already_held(): void
    {
        $tenant = Tenant::create([
            'name' => 'Hold Tenant',
            'slug' => 'hold-tenant',
            'subdomain' => 'hold',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Hold Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Hold Room',
            'code' => 'H1',
            'status' => 'active',
            'base_price' => 100,
            'capacity' => 2,
            'units' => 1,
        ]);

        $guestA = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'guest',
            'home_resort_id' => $resort->id,
        ]);
        $guestB = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'guest',
            'home_resort_id' => $resort->id,
        ]);

        $checkIn = now()->addDays(7)->toDateString();
        $checkOut = now()->addDays(8)->toDateString();

        Sanctum::actingAs($guestA);
        $lockA = $this->postJson('/api/v1/booking-locks', [
            'room_id' => $room->id,
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
        ])->assertCreated()->json('data.lock_token');

        $this->postJson('/api/v1/reservations', [
            'resort_id' => $resort->id,
            'lock_token' => $lockA,
            'guest_count' => 1,
            'total_amount' => 100,
        ])->assertCreated();

        $lockB = BookingLock::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'room_id' => $room->id,
            'lock_token' => (string) \Illuminate\Support\Str::uuid(),
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'expires_at' => now()->addMinutes(10),
            'status' => 'locked',
        ])->lock_token;

        Sanctum::actingAs($guestB);
        $this->postJson('/api/v1/reservations', [
            'resort_id' => $resort->id,
            'lock_token' => $lockB,
            'guest_count' => 1,
            'total_amount' => 100,
        ])->assertStatus(409);

        $this->assertSame(1, Reservation::withoutGlobalScopes()->where('room_id', $room->id)->count());
    }

    public function test_paid_webhook_expires_other_pending_for_same_stay(): void
    {
        $tenant = Tenant::create([
            'name' => 'Pay Tenant',
            'slug' => 'pay-tenant',
            'subdomain' => 'pay',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Pay Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Pay Room',
            'code' => 'P1',
            'status' => 'active',
            'base_price' => 100,
            'capacity' => 2,
            'units' => 1,
        ]);

        $checkIn = now()->addDays(3)->toDateString();
        $checkOut = now()->addDays(4)->toDateString();

        $paid = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'reference_no' => 'RSV-PAIDONE',
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'guest_count' => 1,
            'reservation_fee' => 1,
            'total_amount' => 100,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'inv_paid_dup_test',
            'xendit_payment_status' => 'pending',
        ]);

        $duplicate = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'reference_no' => 'RSV-DUPPEND',
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'guest_count' => 1,
            'reservation_fee' => 1,
            'total_amount' => 100,
            'status' => 'pending_payment',
            'xendit_payment_status' => 'pending',
        ]);

        config(['services.xendit.webhook_token' => 'dup-test-token']);

        $this->postJson('/api/v1/webhooks/xendit/invoices', [
            'id' => 'inv_paid_dup_test',
            'status' => 'PAID',
            'event' => 'invoice.paid',
        ], ['x-callback-token' => 'dup-test-token'])->assertOk();

        $this->assertSame('confirmed', $paid->fresh()->status);
        $this->assertSame('expired', $duplicate->fresh()->status);
    }
}
