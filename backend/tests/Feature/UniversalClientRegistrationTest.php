<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UniversalClientRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function seedListedResort(): array
    {
        $tenant = Tenant::create([
            'name' => 'Client Test Tenant',
            'slug' => 'client-test',
            'subdomain' => 'client-demo',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Client Test Resort',
            'is_publicly_listed' => true,
        ]);

        return [$tenant, $resort];
    }

    public function test_register_client_without_resort_subdomain(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Booker One',
            'email' => 'booker@example.com',
            'password' => 'Password1!x',
            'password_confirmation' => 'Password1!x',
            'role_intent' => 'client',
            'accept_terms' => true,
        ]);

        $response->assertCreated();
        $user = User::query()->where('email', 'booker@example.com')->first();
        $this->assertNotNull($user);
        $this->assertSame('client', $user->role);
        $this->assertNull($user->home_resort_id);
    }

    public function test_register_rejects_guest_role_intent(): void
    {
        $this->seedListedResort();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Legacy Guest',
            'email' => 'legacy@example.com',
            'password' => 'Password1!x',
            'password_confirmation' => 'Password1!x',
            'role_intent' => 'guest',
            'resort_subdomain' => 'client-demo',
            'accept_terms' => true,
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('users', ['email' => 'legacy@example.com']);
    }

    public function test_resort_guest_store_route_removed(): void
    {
        [, $resort] = $this->seedListedResort();
        $owner = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $resort->tenant_id,
        ]);

        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/resort/guests', [
            'name' => 'Manual Guest',
            'email' => 'manual@example.com',
            'password' => 'Password1!x',
            'password_confirmation' => 'Password1!x',
        ])->assertStatus(405);
    }

    public function test_migrate_guests_to_clients_command(): void
    {
        [, $resort] = $this->seedListedResort();
        $guest = User::factory()->create([
            'role' => 'guest',
            'home_resort_id' => $resort->id,
        ]);

        $this->artisan('users:migrate-guests-to-clients')->assertSuccessful();

        $guest->refresh();
        $this->assertSame('client', $guest->role);
        $this->assertNull($guest->home_resort_id);
    }
}
