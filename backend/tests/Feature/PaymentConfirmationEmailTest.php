<?php

namespace Tests\Feature;

use App\Models\EmailLog;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentConfirmationEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_paid_booking_webhook_queues_and_sends_confirmation_and_receipt_emails(): void
    {
        config(['services.xendit.webhook_token' => 'test-webhook-token', 'mail.default' => 'array']);

        $tenant = Tenant::create([
            'name' => 'Mail Tenant',
            'slug' => 'mail-tenant',
            'subdomain' => 'mail',
            'status' => 'active',
        ]);

        $guest = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'guest',
            'email' => 'payguest@example.com',
            'name' => 'Pay Guest',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Mail Resort',
            'is_publicly_listed' => true,
        ]);

        Subscription::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2000,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 1,
            'total_monthly_fee' => 2000,
            'status' => 'active',
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->endOfMonth()->toDateString(),
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
            'email' => 'owner@example.com',
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Deluxe',
            'code' => 'DLX',
            'status' => 'active',
            'base_price' => 1500,
            'capacity' => 2,
        ]);

        Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => $guest->id,
            'reference_no' => 'RSV-MAIL-1',
            'check_in_date' => now()->addDays(5)->toDateString(),
            'check_out_date' => now()->addDays(6)->toDateString(),
            'guest_count' => 2,
            'guest_name' => 'Pay Guest',
            'guest_email' => 'payguest@example.com',
            'reservation_fee' => 1,
            'total_amount' => 0.4,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'inv_mail_paid_1',
            'xendit_payment_status' => 'pending',
            'reserved_at' => now(),
        ]);

        $this->postJson('/api/v1/webhooks/xendit/invoices', [
            'id' => 'inv_mail_paid_1',
            'status' => 'PAID',
            'event' => 'invoice.paid',
            'payer_email' => 'payguest@example.com',
        ], ['x-callback-token' => 'test-webhook-token'])
            ->assertOk();

        $this->assertDatabaseHas('email_logs', [
            'type' => 'booking_confirmation',
            'to_email' => 'payguest@example.com',
            'status' => 'sent',
        ]);
        $this->assertDatabaseHas('email_logs', [
            'type' => 'payment_receipt',
            'to_email' => 'payguest@example.com',
            'status' => 'sent',
        ]);
    }

    public function test_duplicate_paid_webhook_sends_missing_emails_only_once(): void
    {
        config(['services.xendit.webhook_token' => 'test-webhook-token', 'mail.default' => 'array']);

        $tenant = Tenant::create([
            'name' => 'Dup Tenant',
            'slug' => 'dup-tenant',
            'subdomain' => 'dup',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Dup Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Room',
            'code' => 'R1',
            'status' => 'active',
            'base_price' => 1000,
            'capacity' => 2,
        ]);

        $reservation = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'reference_no' => 'RSV-DUP',
            'check_in_date' => now()->addDays(3)->toDateString(),
            'check_out_date' => now()->addDays(4)->toDateString(),
            'guest_count' => 1,
            'guest_email' => 'orphan@example.com',
            'guest_name' => 'Orphan Guest',
            'reservation_fee' => 1,
            'total_amount' => 0.4,
            'status' => 'confirmed',
            'xendit_invoice_id' => 'inv_dup',
            'xendit_payment_status' => 'paid',
            'reserved_at' => now(),
        ]);

        $this->postJson('/api/v1/webhooks/xendit/invoices', [
            'id' => 'inv_dup',
            'status' => 'PAID',
            'event' => 'invoice.paid',
            'payer_email' => 'orphan@example.com',
        ], ['x-callback-token' => 'test-webhook-token'])
            ->assertOk();

        $receiptCount = EmailLog::query()
            ->where('type', 'payment_receipt')
            ->where('to_email', 'orphan@example.com')
            ->where('status', 'sent')
            ->count();

        $this->assertSame(1, $receiptCount);
    }
}
