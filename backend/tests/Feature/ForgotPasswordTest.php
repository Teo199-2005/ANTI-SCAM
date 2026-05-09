<?php

namespace Tests\Feature;

use App\Models\PasswordResetOtp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ForgotPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_request_succeeds_without_leaking_unknown_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nobody@example.com',
        ]);

        $response->assertOk()->assertJsonPath('success', true);
        Mail::assertNothingSent();
    }

    public function test_forgot_password_request_creates_otp_for_existing_user(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'owner@example.com',
            'password' => Hash::make('OldPassword1'),
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $user->email,
        ]);

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseHas('password_reset_otps', ['user_id' => $user->id]);
    }

    public function test_forgot_password_reset_updates_password_and_revokes_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'reset@example.com',
            'password' => Hash::make('OldPassword1'),
        ]);
        $user->createToken('spa-token');

        $plain = '918273';
        PasswordResetOtp::query()->create([
            'user_id' => $user->id,
            'code_hash' => Hash::make($plain),
            'expires_at' => now()->addMinutes(15),
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password/reset', [
            'email' => $user->email,
            'otp' => $plain,
            'password' => 'NewPassword2',
            'password_confirmation' => 'NewPassword2',
        ]);

        $response->assertOk()->assertJsonPath('success', true);
        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword2', $user->getAuthPassword()));
        $this->assertSame(0, $user->tokens()->count());
    }
}
