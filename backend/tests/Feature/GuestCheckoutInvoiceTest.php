<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GuestCheckoutInvoiceTest extends TestCase
{
    use RefreshDatabase;

    private function seedPendingReservation(): array
    {
        $tenant = Tenant::create([
            'name' => 'Inv Tenant',
            'slug' => 'inv-tenant',
            'subdomain' => 'inv',
            'status' => 'active',
        ]);

        $client = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'client',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Inv Resort',
            'is_publicly_listed' => true,
        ]);

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'name' => 'Inv Room',
            'code' => 'I1',
            'status' => 'active',
            'base_price' => 2000,
            'capacity' => 2,
        ]);

        $reservation = Reservation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'room_id' => $room->id,
            'client_id' => $client->id,
            'reference_no' => 'RSV-INV-TEST',
            'check_in_date' => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(3)->toDateString(),
            'guest_count' => 2,
            'reservation_fee' => 500,
            'total_amount' => 2000,
            'status' => 'pending_payment',
            'xendit_invoice_id' => 'inv_resume_1',
            'xendit_payment_status' => 'pending',
            'reserved_at' => null,
        ]);

        return [$client, $reservation];
    }

    public function test_resume_returns_existing_checkout_url_for_pending_xendit_invoice(): void
    {
        config(['services.xendit.secret_key' => 'xnd_development_test_key']);

        [$client, $reservation] = $this->seedPendingReservation();

        Http::fake([
            'https://api.xendit.co/v2/invoices/*' => Http::response([
                'id' => 'inv_resume_1',
                'status' => 'PENDING',
                'invoice_url' => 'https://checkout.xendit.co/resume-test',
            ], 200),
        ]);

        Sanctum::actingAs($client);

        $response = $this->postJson("/api/v1/reservations/{$reservation->id}/invoice");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.invoice_url', 'https://checkout.xendit.co/resume-test')
            ->assertJsonPath('data.resumed', true)
            ->assertJsonPath('data.already_confirmed', false);

        $this->assertSame('inv_resume_1', $reservation->fresh()->xendit_invoice_id);
    }

    public function test_expired_invoice_is_replaced_with_new_one(): void
    {
        config(['services.xendit.secret_key' => 'xnd_development_test_key']);

        [$client, $reservation] = $this->seedPendingReservation();

        Http::fake([
            'https://api.xendit.co/v2/invoices/inv_resume_1' => Http::response([
                'id' => 'inv_resume_1',
                'status' => 'EXPIRED',
            ], 200),
            'https://api.xendit.co/v2/invoices' => Http::response([
                'id' => 'inv_new_2',
                'invoice_url' => 'https://checkout.xendit.co/new-test',
            ], 200),
        ]);

        Sanctum::actingAs($client);

        $response = $this->postJson("/api/v1/reservations/{$reservation->id}/invoice");

        $response->assertOk()
            ->assertJsonPath('data.invoice_url', 'https://checkout.xendit.co/new-test')
            ->assertJsonPath('data.invoice_id', 'inv_new_2')
            ->assertJsonPath('data.resumed', false);

        $this->assertSame('inv_new_2', $reservation->fresh()->xendit_invoice_id);
    }
}
