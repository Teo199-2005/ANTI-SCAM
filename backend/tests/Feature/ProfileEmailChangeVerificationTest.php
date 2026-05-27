<?php

namespace Tests\Feature;

use App\Models\EmailVerificationOtp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileEmailChangeVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_resort_owner_email_change_requires_reverification_and_sends_new_otp(): void
    {
        $user = User::factory()->create([
            'role' => 'resort_owner',
            'email' => 'owner.old@example.com',
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/v1/auth/profile', [
            'email' => 'owner.new@example.com',
        ]);

        $response->assertSuccessful();

        $user->refresh();
        $this->assertSame('owner.new@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
        $this->assertDatabaseHas('email_verification_otps', [
            'user_id' => $user->id,
            'consumed_at' => null,
        ]);
        $this->assertDatabaseHas('email_logs', [
            'to_email' => 'owner.new@example.com',
            'type' => 'email_verification_otp',
        ]);
    }

    public function test_previous_email_otp_is_consumed_when_email_changes(): void
    {
        $user = User::factory()->create([
            'role' => 'marketing',
            'email' => 'marketer.old@example.com',
            'email_verified_at' => now(),
        ]);

        EmailVerificationOtp::query()->create([
            'user_id' => $user->id,
            'code_hash' => bcrypt('123456'),
            'expires_at' => now()->addMinutes(10),
            'consumed_at' => null,
        ]);

        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/auth/profile', [
            'email' => 'marketer.new@example.com',
        ])->assertSuccessful();

        $activeCount = EmailVerificationOtp::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->count();

        $this->assertSame(1, $activeCount);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'marketer.new@example.com',
        ]);
    }
}

