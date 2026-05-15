<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminOverrideAndWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_override_reservation_with_reason(): void
    {
        $tenant = Tenant::create([
            'name' => 'Admin Tenant',
            'slug' => 'admin-tenant',
            'subdomain' => 'admin',
            'status' => 'active',
        ]);

        $admin = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'admin',
        ]);
        Sanctum::actingAs($admin);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Admin Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Admin Room',
            'code' => 'AR1',
            'status' => 'active',
            'base_price' => 1200,
            'capacity' => 2,
        ]);

        $reservation = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => $admin->id,
            'reference_no' => 'RSV-OVERRIDE-1',
            'check_in_date' => now()->addDays(3)->toDateString(),
            'check_out_date' => now()->addDays(4)->toDateString(),
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 1200,
            'status' => 'pending_payment',
            'xendit_payment_status' => 'pending',
            'reserved_at' => now(),
        ]);

        $response = $this->postJson("/api/v1/reservations/{$reservation->id}/admin-override", [
            'status' => 'confirmed',
            'reason' => 'Manual verification completed by admin.',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('reservations', ['id' => $reservation->id, 'status' => 'confirmed']);
        $this->assertDatabaseHas('audit_logs', [
            'entity_type' => 'reservation',
            'entity_id' => $reservation->id,
            'action' => 'reservation_admin_override',
        ]);
    }

    public function test_xendit_webhook_is_idempotent(): void
    {
        config(['services.xendit.webhook_token' => 'test-webhook-token']);

        $tenant = Tenant::create([
            'name' => 'Webhook Tenant',
            'slug' => 'webhook-tenant',
            'subdomain' => 'webhook',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Webhook Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Webhook Room',
            'code' => 'WR1',
            'status' => 'active',
            'base_price' => 1800,
            'capacity' => 2,
        ]);

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => null,
            'reference_no' => 'RSV-WEBHOOK-1',
            'check_in_date' => now()->addDays(5)->toDateString(),
            'check_out_date' => now()->addDays(6)->toDateString(),
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 1800,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'inv_test_123',
            'xendit_payment_status' => 'pending',
            'reserved_at' => now(),
        ]);

        $payload = ['id' => 'inv_test_123', 'status' => 'PAID', 'event' => 'invoice.paid'];
        $headers = ['x-callback-token' => 'test-webhook-token'];

        $this->postJson('/api/v1/webhooks/xendit/invoice', $payload, $headers)->assertOk();
        $this->postJson('/api/v1/webhooks/xendit/invoice', $payload, $headers)->assertOk();

        $this->assertDatabaseCount('xendit_webhook_events', 1);
        $reservation = Reservation::withoutGlobalScopes()->where('xendit_invoice_id', 'inv_test_123')->first();
        $this->assertNotNull($reservation);
        $this->assertMatchesRegularExpression('/^ASPH-BKG-\d{4}-\d{6}$/', (string) $reservation->acknowledgment_receipt_no);
        $firstAck = $reservation->acknowledgment_receipt_no;

        $this->assertDatabaseHas('reservations', [
            'xendit_invoice_id' => 'inv_test_123',
            'status' => 'confirmed',
            'xendit_payment_status' => 'paid',
            'acknowledgment_receipt_no' => $firstAck,
        ]);

        $reservation->refresh();
        $this->assertSame($firstAck, $reservation->acknowledgment_receipt_no);
    }

    public function test_xendit_webhook_rejects_when_token_not_configured(): void
    {
        config(['services.xendit.webhook_token' => '']);

        $response = $this->postJson('/api/v1/webhooks/xendit/invoice', [
            'id' => 'inv_test_401',
            'status' => 'PAID',
            'event' => 'invoice.paid',
        ]);

        $response->assertStatus(401);
    }

    public function test_xendit_webhook_does_not_confirm_for_non_invoice_paid_event(): void
    {
        config(['services.xendit.webhook_token' => 'test-webhook-token']);

        $tenant = Tenant::create([
            'name' => 'Webhook Event Tenant',
            'slug' => 'webhook-event-tenant',
            'subdomain' => 'webhookevent',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Webhook Event Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Webhook Event Room',
            'code' => 'WER1',
            'status' => 'active',
            'base_price' => 1800,
            'capacity' => 2,
        ]);

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => null,
            'reference_no' => 'RSV-WEBHOOK-EVENT-1',
            'check_in_date' => now()->addDays(5)->toDateString(),
            'check_out_date' => now()->addDays(6)->toDateString(),
            'guest_count' => 1,
            'reservation_fee' => 500,
            'total_amount' => 1800,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'inv_test_event_123',
            'xendit_payment_status' => 'pending',
            'reserved_at' => now(),
        ]);

        $payload = ['id' => 'inv_test_event_123', 'status' => 'PENDING', 'event' => 'invoice.created'];
        $headers = ['x-callback-token' => 'test-webhook-token'];

        $this->postJson('/api/v1/webhooks/xendit/invoice', $payload, $headers)->assertOk();

        $this->assertDatabaseHas('reservations', [
            'xendit_invoice_id' => 'inv_test_event_123',
            'status' => 'pending_payment',
            'xendit_payment_status' => 'pending',
        ]);
    }
}
