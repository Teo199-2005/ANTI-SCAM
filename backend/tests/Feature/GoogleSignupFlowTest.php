<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Services\GooglePendingSignupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class GoogleSignupFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_pending_peek_returns_profile_fields(): void
    {
        $service = app(GooglePendingSignupService::class);
        $token = $service->issue('google-abc', 'newguest@example.com', 'New Guest');

        $response = $this->getJson('/api/v1/auth/google-pending?google_token='.$token);

        $response->assertOk()
            ->assertJsonPath('data.email', 'newguest@example.com')
            ->assertJsonPath('data.name', 'New Guest');
    }

    public function test_google_complete_creates_client_with_terms(): void
    {
        $service = app(GooglePendingSignupService::class);
        $token = $service->issue('google-xyz', 'client@example.com', 'Client User');

        $response = $this->postJson('/api/v1/auth/google-complete', [
            'google_token' => $token,
            'role_intent' => 'client',
            'accept_terms' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.email', 'client@example.com')
            ->assertJsonPath('data.user.role', 'client');

        $this->assertDatabaseHas('users', [
            'email' => 'client@example.com',
            'google_id' => 'google-xyz',
            'role' => 'client',
        ]);
    }

    public function test_google_complete_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $service = app(GooglePendingSignupService::class);
        $token = $service->issue('google-dup', 'taken@example.com', 'Taken');

        $response = $this->postJson('/api/v1/auth/google-complete', [
            'google_token' => $token,
            'role_intent' => 'client',
            'accept_terms' => true,
        ]);

        $response->assertStatus(409);
    }

    public function test_expired_google_token_returns_410(): void
    {
        $response = $this->postJson('/api/v1/auth/google-complete', [
            'google_token' => str_repeat('a', 48),
            'role_intent' => 'client',
            'accept_terms' => true,
        ]);

        $response->assertStatus(410);
    }
}
