<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminResortOnboardTest extends TestCase
{
    use RefreshDatabase;

    private const STRONG_PASSWORD = 'Zx7!kQm9pL2wR8vN4tY1hB6cF3sA0eD5uJ';

    public function test_admin_onboard_creates_owner_with_password(): void
    {
        Mail::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/admin/resorts/onboard', [
            'tenant_name' => 'Beach Paradise Properties',
            'resort_name' => 'Beach Paradise Resort',
            'subdomain' => 'beachparadise',
            'plan' => 'basic',
            'owner_name' => 'Juan Dela Cruz',
            'owner_email' => 'owner-new@resort.test',
            'owner_password' => self::STRONG_PASSWORD,
            'owner_password_confirmation' => self::STRONG_PASSWORD,
            'accept_terms' => true,
        ]);

        $response->assertCreated()->assertJsonPath('success', true);

        $owner = User::query()->where('email', 'owner-new@resort.test')->first();
        $this->assertNotNull($owner);
        $this->assertSame('resort_owner', $owner->role);
        $this->assertNotNull($owner->tenant_id);
        $this->assertTrue(Hash::check(self::STRONG_PASSWORD, $owner->password));

        $this->assertDatabaseHas('resorts', [
            'tenant_id' => $owner->tenant_id,
            'name' => 'Beach Paradise Resort',
        ]);
    }

    public function test_admin_onboard_links_existing_unassigned_owner(): void
    {
        Mail::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => null,
            'email' => 'owner-existing@resort.test',
        ]);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/admin/resorts/onboard', [
            'tenant_name' => 'Lagoon Holdings',
            'resort_name' => 'Lagoon Resort',
            'subdomain' => 'lagoonresort',
            'plan' => 'basic',
            'owner_user_id' => $owner->id,
            'accept_terms' => true,
        ]);

        $response->assertCreated()->assertJsonPath('success', true);

        $owner->refresh();
        $this->assertNotNull($owner->tenant_id);
    }
}
