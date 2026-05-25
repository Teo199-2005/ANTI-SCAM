<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\ResortVerificationDocument;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminResortVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function pendingResortWithDocs(): Resort
    {
        $tenant = Tenant::create([
            'name' => 'Verify Queue',
            'slug' => 'verify-queue',
            'subdomain' => 'verify-queue',
            'status' => 'active',
        ]);

        User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $tenant->id,
            'email' => 'owner-verify@example.com',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Queue Resort',
            'verification_status' => 'pending',
            'verification_method' => 'video',
            'verification_submitted_at' => now(),
            'is_publicly_listed' => false,
        ]);

        foreach (['government_id', 'property_tour', 'ownership_proof'] as $type) {
            ResortVerificationDocument::create([
                'resort_id' => $resort->id,
                'document_type' => $type,
                'disk' => 'public',
                'path' => "resort-verification/{$resort->id}/{$type}.jpg",
                'original_name' => "{$type}.jpg",
                'uploaded_at' => now(),
            ]);
        }

        return $resort;
    }

    public function test_admin_can_list_awaiting_review_resorts(): void
    {
        $this->pendingResortWithDocs();
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/resort-verifications?filter=awaiting_review');

        $response->assertOk()
            ->assertJsonPath('data.data.0.name', 'Queue Resort');
    }

    public function test_resort_owner_cannot_access_verification_queue(): void
    {
        $resort = $this->pendingResortWithDocs();
        $owner = User::query()->where('tenant_id', $resort->tenant_id)->where('role', 'resort_owner')->first();

        $this->actingAs($owner)
            ->getJson('/api/v1/admin/resort-verifications')
            ->assertStatus(403);
    }

    public function test_admin_can_approve_resort_verification(): void
    {
        $resort = $this->pendingResortWithDocs();
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson(
            "/api/v1/admin/resort-verifications/{$resort->id}/approve",
            ['list_publicly' => true, 'reason' => 'Documents checked'],
        );

        $response->assertOk()->assertJsonPath('data.verification_status', 'verified');

        $fresh = $resort->fresh();
        $this->assertSame('verified', $fresh->verification_status);
        $this->assertNotNull($fresh->verified_at);
        $this->assertTrue($fresh->is_publicly_listed);
    }

    public function test_admin_can_reject_resort_verification(): void
    {
        $resort = $this->pendingResortWithDocs();
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson(
            "/api/v1/admin/resort-verifications/{$resort->id}/reject",
            ['reason' => 'ID does not match property records'],
        );

        $response->assertOk()->assertJsonPath('data.verification_status', 'rejected');

        $fresh = $resort->fresh();
        $this->assertSame('rejected', $fresh->verification_status);
        $this->assertFalse($fresh->is_publicly_listed);
        $this->assertSame('ID does not match property records', $fresh->verification_rejection_reason);
    }

    public function test_admin_queue_stats_returns_awaiting_count(): void
    {
        $this->pendingResortWithDocs();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/resort-verifications/stats')
            ->assertOk()
            ->assertJsonPath('data.awaiting_review', 1);
    }

    public function test_admin_can_request_more_documents(): void
    {
        $resort = $this->pendingResortWithDocs();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson(
                "/api/v1/admin/resort-verifications/{$resort->id}/request-documents",
                ['reason' => 'Please upload a clearer government ID photo.'],
            )
            ->assertOk()
            ->assertJsonPath('data.verification_status', 'needs_documents');

        $fresh = $resort->fresh();
        $this->assertSame('needs_documents', $fresh->verification_status);
        $this->assertStringContainsString('clearer government ID', (string) $fresh->verification_rejection_reason);
    }
}
