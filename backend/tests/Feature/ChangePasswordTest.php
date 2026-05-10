<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_change_password_requires_correct_current_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword1'),
            'role' => 'client',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/auth/password', [
            'current_password' => 'WrongPassword1',
            'password' => 'NewPassword2',
            'password_confirmation' => 'NewPassword2',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password']);
    }

    public function test_change_password_updates_hash_and_keeps_current_token(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword1'),
            'role' => 'client',
        ]);
        $token = $user->createToken('spa-token');
        $plainToken = $token->plainTextToken;

        $response = $this->postJson('/api/v1/auth/password', [
            'current_password' => 'OldPassword1',
            'password' => 'NewPassword2',
            'password_confirmation' => 'NewPassword2',
        ], [
            'Authorization' => 'Bearer '.$plainToken,
        ]);

        $response->assertOk()->assertJsonPath('success', true);

        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword2', $user->getAuthPassword()));
        $this->assertSame(1, $user->tokens()->count());
        $this->assertSame($token->accessToken->id, $user->tokens()->first()->id);
    }
}
