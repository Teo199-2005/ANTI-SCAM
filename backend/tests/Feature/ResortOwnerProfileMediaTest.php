<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResortOwnerProfileMediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_stream_logo_from_public_disk(): void
    {
        Storage::fake('public');

        $tenant = Tenant::create([
            'name' => 'Media Tenant',
            'slug' => 'media-tenant',
            'subdomain' => 'media',
            'status' => 'active',
        ]);

        $key = 'resort-logos/test-logo.png';
        Storage::disk('public')->put($key, 'fake-logo-bytes');

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Media Resort',
            'logo_url' => '/storage/'.$key,
            'is_publicly_listed' => true,
        ]);

        $owner = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $tenant->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->get('/api/v1/resort-owner/profile-media/logo');

        $response->assertOk();
        $body = method_exists($response, 'streamedContent')
            ? $response->streamedContent()
            : (string) $response->getContent();
        $this->assertSame('fake-logo-bytes', $body);
        $this->assertSame($resort->id, $resort->fresh()->id);
    }

    public function test_profile_media_requires_authentication(): void
    {
        $this->getJson('/api/v1/resort-owner/profile-media/logo')->assertUnauthorized();
    }
}
