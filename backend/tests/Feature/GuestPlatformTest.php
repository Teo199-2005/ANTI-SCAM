<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GuestPlatformTest extends TestCase
{
    use RefreshDatabase;

    private function seedListedResort(string $subdomain = 'beach-demo'): array
    {
        $tenant = Tenant::create([
            'name' => 'Guest Test Tenant',
            'slug' => 'guest-test',
            'subdomain' => $subdomain,
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Guest Test Resort',
            'is_publicly_listed' => true,
        ]);

        return [$tenant, $resort];
    }

    public function test_register_guest_with_valid_subdomain_sets_home_resort(): void
    {
        [$tenant, $resort] = $this->seedListedResort();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Resort Guest',
            'email' => 'resort-guest-reg@example.com',
            'password' => 'Password1!x',
            'password_confirmation' => 'Password1!x',
            'role_intent' => 'guest',
            'resort_subdomain' => $tenant->subdomain,
            'accept_terms' => true,
        ]);

        $response->assertCreated()->assertJsonPath('success', true);

        $user = User::query()->where('email', 'resort-guest-reg@example.com')->first();
        $this->assertNotNull($user);
        $this->assertSame('guest', $user->role);
        $this->assertSame($resort->id, $user->home_resort_id);
        $this->assertNull($user->tenant_id);
    }

    public function test_register_guest_rejects_invalid_subdomain(): void
    {
        $this->seedListedResort();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Bad Guest',
            'email' => 'bad-guest@example.com',
            'password' => 'Password1!x',
            'password_confirmation' => 'Password1!x',
            'role_intent' => 'guest',
            'resort_subdomain' => 'no-such-resort-slug-xyz',
            'accept_terms' => true,
        ]);

        $response->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_guest_cannot_access_resort_guest_directory(): void
    {
        [, $resort] = $this->seedListedResort();
        $guest = User::factory()->create([
            'role' => 'guest',
            'home_resort_id' => $resort->id,
            'tenant_id' => null,
        ]);

        Sanctum::actingAs($guest);

        $this->getJson('/api/v1/resort/guests')->assertForbidden();
    }

    public function test_resort_owner_fetches_guest_history_by_guest_key(): void
    {
        [$tenant, $resort] = $this->seedListedResort('hist-tenant');
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);
        $booker = User::factory()->create([
            'email' => 'Booker.History@example.com',
            'role' => 'client',
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Hist Room',
            'code' => 'H1',
            'status' => 'active',
            'base_price' => 1500,
            'capacity' => 2,
        ]);

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => $booker->id,
            'guest_email' => 'history-guest-key@test.com',
            'reference_no' => 'RSV-H1',
            'check_in_date' => now()->addDays(1)->toDateString(),
            'check_out_date' => now()->addDays(2)->toDateString(),
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 1500,
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
        ]);
        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => $booker->id,
            'guest_email' => 'history-guest-key@test.com',
            'reference_no' => 'RSV-H2',
            'check_in_date' => now()->addDays(10)->toDateString(),
            'check_out_date' => now()->addDays(11)->toDateString(),
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 1500,
            'status' => 'pending_payment',
            'xendit_payment_status' => 'pending',
        ]);

        $guestKey = 'history-guest-key@test.com';

        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/resort/guests/'.rawurlencode($guestKey).'/reservations');

        $response->assertOk()->assertJsonPath('success', true);
        $rows = $response->json('data.data');
        $this->assertIsArray($rows);
        $this->assertCount(2, $rows);
    }

    public function test_guest_user_can_resume_xendit_invoice_for_own_reservation(): void
    {
        config(['services.xendit.secret_key' => 'xnd_development_test_key']);

        [$tenant, $resort] = $this->seedListedResort('inv-guest');
        $guest = User::factory()->create([
            'role' => 'guest',
            'home_resort_id' => $resort->id,
            'tenant_id' => null,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Inv Guest Room',
            'code' => 'G1',
            'status' => 'active',
            'base_price' => 2000,
            'capacity' => 2,
        ]);

        $reservation = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => $guest->id,
            'reference_no' => 'RSV-GUEST-INV',
            'check_in_date' => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(3)->toDateString(),
            'guest_count' => 2,
            'reservation_fee' => 500,
            'total_amount' => 2000,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'guest_inv_1',
            'xendit_payment_status' => 'pending',
            'reserved_at' => null,
        ]);

        Http::fake([
            'https://api.xendit.co/v2/invoices/*' => Http::response([
                'id' => 'guest_inv_1',
                'status' => 'PENDING',
                'invoice_url' => 'https://checkout.xendit.co/guest-resume',
            ], 200),
        ]);

        Sanctum::actingAs($guest);

        $response = $this->postJson("/api/v1/reservations/{$reservation->id}/invoice");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.invoice_url', 'https://checkout.xendit.co/guest-resume')
            ->assertJsonPath('data.resumed', true);
    }

    public function test_me_includes_home_resort_summary_for_guest(): void
    {
        [$tenant, $resort] = $this->seedListedResort('me-guest-sub');
        $guest = User::factory()->create([
            'role' => 'guest',
            'home_resort_id' => $resort->id,
            'tenant_id' => null,
        ]);

        Sanctum::actingAs($guest);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJsonPath('data.home_resort.id', $resort->id)
            ->assertJsonPath('data.home_resort.name', $resort->name)
            ->assertJsonPath('data.home_resort.slug', $tenant->subdomain);
    }
}
