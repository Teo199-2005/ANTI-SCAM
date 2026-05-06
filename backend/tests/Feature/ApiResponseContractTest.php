<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiResponseContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_reservations_index_uses_standard_api_response_shape(): void
    {
        $tenant = Tenant::create([
            'name' => 'Contract Tenant',
            'slug' => 'contract-tenant',
            'subdomain' => 'contract',
            'status' => 'active',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'user',
        ]);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/reservations');
        $response->assertOk()->assertJsonStructure([
            'success',
            'message',
            'data',
            'errors',
        ]);
    }
}
