<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class TermsAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_terms_endpoint_returns_payload(): void
    {
        $response = $this->getJson('/api/v1/legal/terms');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.version', '2026-05')
            ->assertJsonPath('data.product_name', 'Anti-Scam PH');
    }

    public function test_register_requires_accept_terms(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Owner Test',
            'email' => 'owner-terms@example.com',
            'password' => 'Zx7!kQm9pL2wR8vN4tY1hB6cF3sA0eD5uJ',
            'password_confirmation' => 'Zx7!kQm9pL2wR8vN4tY1hB6cF3sA0eD5uJ',
            'role_intent' => 'resort_owner',
        ]);

        $response->assertStatus(422);
        Mail::assertNothingSent();
    }

    public function test_register_records_terms_acceptance_and_logs_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Owner Test',
            'email' => 'owner-terms-ok@example.com',
            'password' => 'Zx7!kQm9pL2wR8vN4tY1hB6cF3sA0eD5uJ',
            'password_confirmation' => 'Zx7!kQm9pL2wR8vN4tY1hB6cF3sA0eD5uJ',
            'role_intent' => 'resort_owner',
            'accept_terms' => true,
        ]);

        $response->assertCreated()->assertJsonPath('success', true);

        $user = User::query()->where('email', 'owner-terms-ok@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertSame('2026-05', $user->terms_version);

        $this->assertDatabaseHas('email_logs', [
            'type' => 'terms_accepted',
            'to_email' => 'owner-terms-ok@example.com',
            'status' => 'sent',
        ]);
    }
}
