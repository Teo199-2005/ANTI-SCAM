<?php

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\Room;
use App\Models\RoomImage;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Billing\Services\XenditSubscriptionWebhookService;
use App\Services\PhilippineLocationService;
use Carbon\Carbon;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests for the referral "first month free" feature:
 *  - Profile/readiness gate blocks checkout when profile is incomplete
 *  - 1-month term is blocked (promo requires multi-month)
 *  - Standard rates are charged (no referral tier discount)
 *  - Charge reflects N-1 months for an N-month term (first month free)
 *  - Webhook credits the full N-month term to the subscription
 *  - ReferralValidationController returns readiness payload
 */
class ReferralFirstMonthFreeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PsgcReferenceSeeder::class);
    }

    private static int $counter = 0;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function makeTenant(array $attrs = []): Tenant
    {
        self::$counter++;

        return Tenant::create(array_merge([
            'name' => 'Tenant '.self::$counter,
            'slug' => 'tenant-'.self::$counter,
            'subdomain' => 'tenant-'.self::$counter,
            'status' => 'active',
        ], $attrs));
    }

    private function makeResortOwner(Tenant $tenant): User
    {
        return User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
        ]);
    }

    private function makeMarketer(Tenant $tenant): User
    {
        return User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'marketing',
            'referral_code' => 'TESTCODE001',
        ]);
    }

    private function makeResort(Tenant $tenant, array $attrs = []): Resort
    {
        $resort = Resort::withoutGlobalScopes()->create(array_merge([
            'tenant_id' => $tenant->id,
            'name' => 'Test Resort',
            'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
            'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
            'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
            'address_label' => null,
            'contact_number' => '09170000001',
            'logo_url' => '/storage/logo.png',
            'background_image_url' => '/storage/bg.jpg',
            'is_publicly_listed' => true,
        ], $attrs));
        app(PhilippineLocationService::class)->syncResortAddressLabel($resort);

        return $resort;
    }

    private function makeSubscription(Resort $resort, string $status = 'pending_payment'): Subscription
    {
        return Subscription::create([
            'tenant_id' => $resort->tenant_id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2100,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 0,
            'total_monthly_fee' => 2100,
            'status' => $status,
            'billing_cycle_start' => now()->startOfMonth()->toDateString(),
            'billing_cycle_end' => now()->endOfMonth()->toDateString(),
            'next_due_date' => now()->toDateString(),
        ]);
    }

    /** Add an active room with a photo to a resort so readiness passes. */
    private function addRoomWithImage(Resort $resort): Room
    {
        Storage::fake('public');
        Storage::disk('public')->put('rooms/room.jpg', 'fake');

        $room = Room::withoutGlobalScopes()->create([
            'tenant_id' => $resort->tenant_id,
            'resort_id' => $resort->id,
            'name' => 'Suite A',
            'status' => 'active',
            'base_price' => 1500,
            'capacity' => 2,
        ]);

        RoomImage::create([
            'room_id' => $room->id,
            'tenant_id' => $resort->tenant_id,
            'path' => 'rooms/room.jpg',
            'disk' => 'public',
            'original_name' => 'room.jpg',
            'sort_order' => 1,
            'is_primary' => true,
        ]);

        return $room;
    }

    private function assignMarketerToResort(User $marketer, Resort $resort): void
    {
        DB::table('marketer_resorts')->insert([
            'marketer_id' => $marketer->id,
            'resort_id' => $resort->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    // ─── Referral validation endpoint ────────────────────────────────────────

    public function test_referral_validation_returns_readiness_payload(): void
    {
        $tenant = $this->makeTenant();
        $owner = $this->makeResortOwner($tenant);
        $marketer = $this->makeMarketer($tenant);
        $resort = $this->makeResort($tenant);
        $this->addRoomWithImage($resort);
        $this->assignMarketerToResort($marketer, $resort);

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/public/referrals/validate', [
            'code' => 'TESTCODE001',
            'resort_id' => $resort->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.valid', true);
        $response->assertJsonPath('data.code', 'TESTCODE001');
        $this->assertNotNull($response->json('data.readiness'));
        $response->assertJsonPath('data.readiness.is_ready', true);
    }

    public function test_referral_validation_returns_readiness_with_missing_fields_when_incomplete(): void
    {
        $tenant = $this->makeTenant();
        $owner = $this->makeResortOwner($tenant);
        $marketer = $this->makeMarketer($tenant);
        // Resort missing logo and background image; no room with image
        $resort = $this->makeResort($tenant, [
            'logo_url' => null,
            'background_image_url' => null,
        ]);
        $this->assignMarketerToResort($marketer, $resort);

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/public/referrals/validate', [
            'code' => 'TESTCODE001',
            'resort_id' => $resort->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.valid', true);
        $response->assertJsonPath('data.readiness.is_ready', false);
        $this->assertContains('logo', $response->json('data.readiness.missing_fields'));
        $this->assertContains('room_with_image', $response->json('data.readiness.missing_fields'));
    }

    // ─── Invoice creation: gate checks ───────────────────────────────────────

    public function test_referral_checkout_blocked_when_profile_incomplete(): void
    {
        config(['services.xendit.allow_mock_paid' => false]);

        $tenant = $this->makeTenant();
        $owner = $this->makeResortOwner($tenant);
        $marketer = $this->makeMarketer($tenant);
        $resort = $this->makeResort($tenant, [
            'logo_url' => null,
            'background_image_url' => null,
        ]);
        $this->makeSubscription($resort);
        $this->assignMarketerToResort($marketer, $resort);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/v1/resorts/{$resort->id}/subscriptions/pay-invoice", [
            'billing_scope' => 'monthly',
            'subscription_duration_months' => 3,
            'referral_code' => 'TESTCODE001',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('errors.referral_code.0', 'profile_incomplete');
        $this->assertContains('logo', $response->json('errors.missing_fields'));
        $this->assertContains('room_with_image', $response->json('errors.missing_fields'));
    }

    public function test_referral_checkout_blocked_for_one_month_term(): void
    {
        config(['services.xendit.allow_mock_paid' => false]);

        $tenant = $this->makeTenant();
        $owner = $this->makeResortOwner($tenant);
        $marketer = $this->makeMarketer($tenant);
        $resort = $this->makeResort($tenant);
        $this->addRoomWithImage($resort);
        $this->makeSubscription($resort);
        $this->assignMarketerToResort($marketer, $resort);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/v1/resorts/{$resort->id}/subscriptions/pay-invoice", [
            'billing_scope' => 'monthly',
            'subscription_duration_months' => 1,
            'referral_code' => 'TESTCODE001',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('errors.referral_code.0', 'invalid_duration');
    }

    // ─── Invoice creation: amounts ────────────────────────────────────────────

    public function test_referral_checkout_charges_standard_rate_minus_one_month_for_3m(): void
    {
        config(['services.xendit.allow_mock_paid' => true]);

        $tenant = $this->makeTenant();
        $owner = $this->makeResortOwner($tenant);
        $marketer = $this->makeMarketer($tenant);
        $resort = $this->makeResort($tenant);
        $this->addRoomWithImage($resort);
        $this->makeSubscription($resort);
        $this->assignMarketerToResort($marketer, $resort);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/v1/resorts/{$resort->id}/subscriptions/pay-invoice", [
            'billing_scope' => 'monthly',
            'subscription_duration_months' => 3,
            'referral_code' => 'TESTCODE001',
        ]);

        $response->assertOk();

        // Standard 3-month rate = ₱1,900/mo; first month free → charge 2 months = ₱3,800
        $invoice = SubscriptionInvoice::where('resort_id', $resort->id)->latest('id')->first();
        $this->assertNotNull($invoice);
        $this->assertEquals(3800.0, (float) $invoice->amount);
        $this->assertStringContainsString('_m3_fmf', (string) $invoice->plan);
        $this->assertEquals('TESTCODE001', $invoice->referral_code);
    }

    public function test_referral_checkout_charges_standard_rate_minus_one_month_for_12m(): void
    {
        config(['services.xendit.allow_mock_paid' => true]);

        $tenant = $this->makeTenant();
        $owner = $this->makeResortOwner($tenant);
        $marketer = $this->makeMarketer($tenant);
        $resort = $this->makeResort($tenant);
        $this->addRoomWithImage($resort);
        $this->makeSubscription($resort);
        $this->assignMarketerToResort($marketer, $resort);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/v1/resorts/{$resort->id}/subscriptions/pay-invoice", [
            'billing_scope' => 'monthly',
            'subscription_duration_months' => 12,
            'referral_code' => 'TESTCODE001',
        ]);

        $response->assertOk();

        // Standard 12-month rate = ₱1,500/mo; first month free → charge 11 months = ₱16,500
        $invoice = SubscriptionInvoice::where('resort_id', $resort->id)->latest('id')->first();
        $this->assertNotNull($invoice);
        $this->assertEquals(16500.0, (float) $invoice->amount);
        $this->assertStringContainsString('_m12_fmf', (string) $invoice->plan);
    }

    public function test_no_referral_charges_full_standard_amount(): void
    {
        config(['services.xendit.allow_mock_paid' => true]);

        $tenant = $this->makeTenant();
        $owner = $this->makeResortOwner($tenant);
        $resort = $this->makeResort($tenant);
        $this->addRoomWithImage($resort);
        $this->makeSubscription($resort);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/v1/resorts/{$resort->id}/subscriptions/pay-invoice", [
            'billing_scope' => 'monthly',
            'subscription_duration_months' => 12,
        ]);

        $response->assertOk();

        // Standard 12-month rate = ₱1,500/mo × 12 = ₱18,000
        $invoice = SubscriptionInvoice::where('resort_id', $resort->id)->latest('id')->first();
        $this->assertNotNull($invoice);
        $this->assertEquals(18000.0, (float) $invoice->amount);
        $this->assertStringContainsString('_m12_b0', (string) $invoice->plan);
    }

    // ─── Webhook: month credit ────────────────────────────────────────────────

    public function test_webhook_credits_full_term_for_first_month_free_invoice(): void
    {
        $tenant = $this->makeTenant();
        $owner = $this->makeResortOwner($tenant);
        $resort = $this->makeResort($tenant);
        $subscription = $this->makeSubscription($resort, 'pending_payment');
        $cycleStart = $subscription->billing_cycle_start;
        $cycleEnd = $subscription->billing_cycle_end;

        // Simulate a paid _fmf invoice (3-month plan, 2 months charged)
        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'mock-fmf-inv-001',
            'xendit_invoice_url' => 'https://checkout.xendit.co/mock',
            'amount' => 3800.0,
            'plan' => 'basic_m3_fmf',
            'referral_code' => 'TESTCODE001',
            'status' => 'pending',
            'billing_cycle_start' => $cycleStart,
            'billing_cycle_end' => $cycleEnd,
        ]);

        /** @var XenditSubscriptionWebhookService $svc */
        $svc = app(XenditSubscriptionWebhookService::class);
        $svc->handleInvoiceWebhook([
            'id' => 'mock-fmf-inv-001',
            'status' => 'PAID',
            'event' => 'invoice.paid',
        ]);

        $subscription->refresh();
        $this->assertEquals('active', $subscription->status);

        // Full 3-month term credited: new end = cycleEnd + 1 day (next start) + 3 months - 1 day
        $expectedEnd = Carbon::parse((string) $cycleEnd)
            ->addDay()
            ->addMonthsNoOverflow(3)
            ->subDay()
            ->toDateString();

        $this->assertEquals($expectedEnd, $subscription->billing_cycle_end->toDateString());
    }

    public function test_webhook_credits_full_term_for_legacy_bonus_invoice(): void
    {
        $tenant = $this->makeTenant();
        $owner = $this->makeResortOwner($tenant);
        $resort = $this->makeResort($tenant);
        $subscription = $this->makeSubscription($resort, 'pending_payment');
        $cycleEnd = $subscription->billing_cycle_end;

        // Legacy _b1 invoice: paidMonths=12, bonusMonths=1 → credited=13
        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->id,
            'resort_id' => $resort->id,
            'xendit_invoice_id' => 'mock-b1-inv-001',
            'xendit_invoice_url' => 'https://checkout.xendit.co/mock',
            'amount' => 18000.0,
            'plan' => 'basic_m12_b1',
            'status' => 'pending',
            'billing_cycle_start' => $subscription->billing_cycle_start,
            'billing_cycle_end' => $cycleEnd,
        ]);

        /** @var XenditSubscriptionWebhookService $svc */
        $svc = app(XenditSubscriptionWebhookService::class);
        $svc->handleInvoiceWebhook([
            'id' => 'mock-b1-inv-001',
            'status' => 'PAID',
            'event' => 'invoice.paid',
        ]);

        $subscription->refresh();
        // Legacy: credited = 12 + 1 = 13 months
        $expectedEnd = Carbon::parse((string) $cycleEnd)
            ->addDay()
            ->addMonthsNoOverflow(13)
            ->subDay()
            ->toDateString();

        $this->assertEquals($expectedEnd, $subscription->billing_cycle_end->toDateString());
    }
}
