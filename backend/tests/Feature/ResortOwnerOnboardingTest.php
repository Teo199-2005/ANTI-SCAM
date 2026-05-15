<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResortOwnerOnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_resort_owner_register_creates_workspace(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Hayatop Paet',
            'email' => 'owner-workspace@example.com',
            'password' => 'Zx7!kQm9pL2wR8vN4tY1hB6cF3sA0eD5uJ',
            'password_confirmation' => 'Zx7!kQm9pL2wR8vN4tY1hB6cF3sA0eD5uJ',
            'role_intent' => 'resort_owner',
            'business_name' => 'Hayatop Resort',
            'accept_terms' => true,
        ]);

        $response->assertCreated()->assertJsonPath('success', true);

        $user = User::query()->where('email', 'owner-workspace@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->tenant_id);

        $this->assertDatabaseHas('resorts', [
            'tenant_id' => $user->tenant_id,
            'name' => 'Hayatop Resort',
        ]);

        $this->assertDatabaseHas('subscriptions', [
            'tenant_id' => $user->tenant_id,
            'status' => 'expired',
        ]);
    }

    public function test_resort_owner_onboard_endpoint_succeeds_for_legacy_account(): void
    {
        Mail::fake();

        $owner = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => null,
            'terms_accepted_at' => now(),
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/resort-owner/onboard', [
            'tenant_name' => 'Legacy Owner',
            'resort_name' => "Legacy Owner's Resort",
            'is_publicly_listed' => false,
        ]);

        $response->assertCreated()->assertJsonPath('success', true);

        $owner->refresh();
        $this->assertNotNull($owner->tenant_id);
        $this->assertSame(1, Resort::withoutGlobalScopes()->where('tenant_id', $owner->tenant_id)->count());
    }

    public function test_resort_owner_onboard_requires_accept_terms_when_not_yet_accepted(): void
    {
        $owner = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => null,
            'terms_accepted_at' => null,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/resort-owner/onboard', [
            'tenant_name' => 'Needs Terms',
            'resort_name' => 'Needs Terms Resort',
        ]);

        $response->assertStatus(422);
    }
}
