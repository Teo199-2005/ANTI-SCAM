<?php

namespace Tests\Feature;

use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\MarketerPayoutBatch;
use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use App\Models\XenditWebhookEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketerPayoutFlowTest extends TestCase
{
    use RefreshDatabase;

    private function seedMarketerWithCommission(): array
    {
        $tenant = Tenant::create([
            'name' => 'Payout Tenant',
            'slug' => 'payout-tenant',
            'subdomain' => 'payout',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Payout Resort',
            'is_publicly_listed' => true,
        ]);

        $marketer = User::factory()->create([
            'tenant_id' => null,
            'role' => 'marketing',
            'gcash_account_number' => '09123456789',
            'gcash_account_holder_name' => 'Test Marketer',
        ]);

        $commission = Commission::query()->create([
            'marketer_id' => $marketer->id,
            'resort_id' => $resort->id,
            'period' => '2026-03',
            'gross_bookings' => 0,
            'commission_rate' => 0,
            'commission_amount' => 250,
            'status' => 'pending',
        ]);

        return compact('tenant', 'resort', 'marketer', 'commission');
    }

    public function test_payout_command_creates_xendit_request_and_webhook_releases_commissions(): void
    {
        config([
            'services.marketing_payout.enabled' => true,
            'services.xendit.secret_key' => 'xnd_development_test_key',
            'services.xendit.webhook_token' => 'test-verify-token',
        ]);

        $seed = $this->seedMarketerWithCommission();

        Http::fake([
            'https://api.xendit.co/v2/payouts' => Http::response([
                'id' => 'disb_test_123',
                'status' => 'ACCEPTED',
                'reference_id' => 'PLACEHOLDER',
            ], 200),
        ]);

        $this->artisan('marketing:process-commission-payouts', ['--date' => '2026-05-10'])
            ->assertSuccessful();

        $batch = MarketerPayoutBatch::query()->first();
        $this->assertNotNull($batch);
        $this->assertSame(MarketerPayoutBatch::STATUS_SUBMITTED, $batch->status);
        $this->assertSame('disb_test_123', $batch->xendit_payout_id);
        $this->assertSame(225.0, (float) $batch->total_amount);

        $this->assertDatabaseHas('commissions', [
            'id' => $seed['commission']->id,
            'payout_batch_id' => $batch->id,
            'status' => 'pending',
        ]);

        $ref = $batch->reference_id;

        $this->postJson('/api/v1/webhooks/xendit/payout', [
            'id' => 'wh_1',
            'event' => 'payout.succeeded',
            'data' => [
                'id' => 'disb_test_123',
                'reference_id' => $ref,
                'status' => 'SUCCEEDED',
                'amount' => 225,
                'currency' => 'PHP',
            ],
        ], ['x-callback-token' => 'test-verify-token'])
            ->assertSuccessful();

        $seed['commission']->refresh();
        $this->assertSame('released', $seed['commission']->status);
        $this->assertDatabaseHas('commission_releases', [
            'commission_id' => $seed['commission']->id,
            'release_source' => 'xendit',
            'payout_batch_id' => $batch->id,
            'amount' => 225,
        ]);

        $batch->refresh();
        $this->assertSame(MarketerPayoutBatch::STATUS_SUCCEEDED, $batch->status);
    }

    public function test_payout_webhook_is_idempotent(): void
    {
        config([
            'services.marketing_payout.enabled' => true,
            'services.xendit.secret_key' => 'xnd_development_test_key',
            'services.xendit.webhook_token' => 'test-verify-token',
        ]);

        $seed = $this->seedMarketerWithCommission();

        Http::fake([
            'https://api.xendit.co/v2/payouts' => Http::response([
                'id' => 'disb_test_456',
                'status' => 'ACCEPTED',
                'reference_id' => 'PLACEHOLDER',
            ], 200),
        ]);

        $this->artisan('marketing:process-commission-payouts', ['--date' => '2026-05-10']);
        $batch = MarketerPayoutBatch::query()->first();
        $ref = $batch->reference_id;

        $payload = [
            'id' => 'wh_same',
            'event' => 'payout.succeeded',
            'data' => [
                'id' => 'disb_test_456',
                'reference_id' => $ref,
                'status' => 'SUCCEEDED',
                'amount' => 225,
            ],
        ];

        $this->postJson('/api/v1/webhooks/xendit/payout', $payload, ['x-callback-token' => 'test-verify-token'])
            ->assertSuccessful();
        $this->postJson('/api/v1/webhooks/xendit/payout', $payload, ['x-callback-token' => 'test-verify-token'])
            ->assertSuccessful();

        $this->assertSame(1, XenditWebhookEvent::query()->where('event_id', 'wh_same')->count());
        $this->assertSame(1, CommissionRelease::query()->where('commission_id', $seed['commission']->id)->count());
    }

    public function test_marketing_user_can_update_gcash_via_profile(): void
    {
        $user = User::factory()->create([
            'role' => 'marketing',
        ]);
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/auth/profile', [
            'gcash_account_number' => '09171234567',
            'gcash_account_holder_name' => 'Maria Santos',
        ])->assertSuccessful();

        $user->refresh();
        $this->assertSame('09171234567', $user->gcash_account_number);
        $this->assertSame('Maria Santos', $user->gcash_account_holder_name);
    }

    public function test_marketing_user_can_update_contact_tin_and_bank_via_profile(): void
    {
        $user = User::factory()->create([
            'role' => 'marketing',
            'phone' => null,
            'marketer_mailing_address' => null,
            'marketer_tin' => null,
        ]);
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/auth/profile', [
            'phone' => '09170001122',
            'marketer_mailing_address' => '12 Sample St, Quezon City, Metro Manila 1100',
            'marketer_tin' => '123-456-789-000',
        ])->assertSuccessful();

        $user->refresh();
        $this->assertSame('09170001122', $user->phone);
        $this->assertSame('12 Sample St, Quezon City, Metro Manila 1100', $user->marketer_mailing_address);
        $this->assertSame('123456789000', $user->marketer_tin);

        $this->patchJson('/api/v1/auth/profile', [
            'marketer_bank_name' => 'BPI',
            'marketer_bank_branch' => 'Katipunan',
            'marketer_bank_account_name' => 'Maria Clara Santos',
            'marketer_bank_account_number' => '1234-5678901',
        ])->assertSuccessful();

        $user->refresh();
        $this->assertSame('BPI', $user->marketer_bank_name);
        $this->assertSame('Katipunan', $user->marketer_bank_branch);
        $this->assertSame('Maria Clara Santos', $user->marketer_bank_account_name);
        $this->assertSame('1234-5678901', $user->marketer_bank_account_number);
    }
}
