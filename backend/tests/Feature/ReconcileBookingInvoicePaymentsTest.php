<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ReconcileBookingInvoicePaymentsTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_confirms_reservation_when_xendit_reports_paid(): void
    {
        Mail::fake();

        config(['services.xendit.secret_key' => 'xnd_development_test_key']);

        $tenant = Tenant::create([
            'name' => 'Rec Tenant',
            'slug' => 'rec-tenant',
            'subdomain' => 'rec',
            'status' => 'active',
        ]);

        $client = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'client',
            'email' => 'guest-rec@example.com',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Rec Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Rec Room',
            'code' => 'R1',
            'status' => 'active',
            'base_price' => 2000,
            'capacity' => 2,
        ]);

        $reservation = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => $client->id,
            'reference_no' => 'RSV-RECON-1',
            'check_in_date' => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(3)->toDateString(),
            'guest_count' => 2,
            'reservation_fee' => 500,
            'total_amount' => 2000,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'inv_reconcile_test_1',
            'xendit_payment_status' => 'pending',
            'reserved_at' => null,
        ]);

        Http::fake([
            'https://api.xendit.co/v2/invoices/*' => Http::response([
                'id' => 'inv_reconcile_test_1',
                'external_id' => 'RSV-RECON-1',
                'status' => 'PAID',
            ], 200),
        ]);

        $this->artisan('payments:reconcile-booking-invoices')->assertSuccessful();

        $reservation->refresh();
        $this->assertSame('paid', $reservation->xendit_payment_status);
        $this->assertSame('confirmed', $reservation->status);
    }
}
