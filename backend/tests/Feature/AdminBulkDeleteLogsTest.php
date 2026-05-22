<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Models\XenditWebhookEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminBulkDeleteLogsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_bulk_delete_audit_logs(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $log1 = AuditLog::withoutGlobalScopes()->create([
            'action' => 'test_one',
            'entity_type' => 'resort',
            'entity_id' => 1,
        ]);
        $log2 = AuditLog::withoutGlobalScopes()->create([
            'action' => 'test_two',
            'entity_type' => 'resort',
            'entity_id' => 2,
        ]);
        $logs = collect([$log1, $log2]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/audit-logs/bulk-delete', [
            'ids' => $logs->pluck('id')->all(),
        ])
            ->assertSuccessful()
            ->assertJsonPath('data.deleted', 2);

        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_admin_can_bulk_delete_xendit_webhook_logs(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $event = XenditWebhookEvent::query()->create([
            'event_id' => 'evt_test_1',
            'event_type' => 'invoice.paid',
            'invoice_id' => 'inv_test',
            'processed_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/xendit-logs/bulk-delete', ['ids' => [$event->id]])
            ->assertSuccessful()
            ->assertJsonPath('data.deleted', 1);

        $this->assertDatabaseMissing('xendit_webhook_events', ['id' => $event->id]);
    }

    public function test_non_admin_cannot_bulk_delete_audit_logs(): void
    {
        $owner = User::factory()->create(['role' => 'resort_owner']);
        $log = AuditLog::withoutGlobalScopes()->create([
            'action' => 'test',
            'entity_type' => 'resort',
            'entity_id' => 1,
        ]);

        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/admin/audit-logs/bulk-delete', ['ids' => [$log->id]])
            ->assertForbidden();
    }
}
