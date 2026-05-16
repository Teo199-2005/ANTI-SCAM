<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PricingPilotXenditSubscriptionInvoiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_pilot_forces_flat_amount_on_xendit_subscription_invoice(): void
    {
        config([
            'pricing.pilot_mode' => true,
            'pricing.pilot_amount_php' => 1,
            'services.xendit.secret_key' => 'xnd_development_test_key',
        ]);

        $tenant = Tenant::create([
            'name' => 'Pilot Tenant',
            'slug' => 'pilot-tenant',
            'subdomain' => 'pilotx',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Pilot Resort',
            'is_publicly_listed' => true,
        ]);

        Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2100,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 1,
            'total_monthly_fee' => 2100,
            'status' => 'expired',
            'billing_cycle_start' => now()->subMonth()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->subMonth()->endOfMonth()->toDateString(),
            'next_due_date' => now()->subDay()->toDateString(),
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
            'email' => 'pilot-owner@example.test',
        ]);

        $posted = null;
        Http::fake(function (\Illuminate\Http\Client\Request $request) use (&$posted) {
            if (str_contains($request->url(), 'api.xendit.co/v2/invoices')) {
                $posted = json_decode($request->body(), true, 512, JSON_THROW_ON_ERROR);
            }

            return Http::response([
                'id' => 'inv_pilot_sub_1',
                'invoice_url' => 'https://checkout.xendit.co/pilot-sub',
            ], 200);
        });

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/v1/resorts/{$resort->id}/subscriptions/pay-invoice", [
            'billing_scope' => 'monthly',
            'subscription_duration_months' => 12,
        ]);

        $response->assertOk()->assertJsonPath('success', true);

        $this->assertIsArray($posted);
        $this->assertSame(1.0, (float) $posted['amount']);
        $this->assertSame(1, $posted['items'][0]['quantity'] ?? null);
        $this->assertSame(1.0, (float) ($posted['items'][0]['price'] ?? 0.0));
    }
}
