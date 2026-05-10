<?php

namespace Tests\Feature;

use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\MarketerPayoutBatch;
use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use App\Models\MarketerPayoutBatchItem;
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

    public function test_payout_webhook_resolves_amount_via_xendit_api_when_omitted(): void
    {
        config([
            'services.marketing_payout.enabled' => true,
            'services.xendit.secret_key' => 'xnd_development_test_key',
            'services.xendit.webhook_token' => 'test-verify-token',
        ]);

        $seed = $this->seedMarketerWithCommission();

        Http::fake([
            'https://api.xendit.co/v2/payouts' => Http::response([
                'id' => 'disb_test_no_amt_wh',
                'status' => 'ACCEPTED',
                'reference_id' => 'PLACEHOLDER',
            ], 200),
            'https://api.xendit.co/v2/payouts/*' => Http::response([
                'id' => 'disb_test_no_amt_wh',
                'reference_id' => 'PLACEHOLDER',
                'status' => 'SUCCEEDED',
                'amount' => 225,
                'currency' => 'PHP',
            ], 200),
        ]);

        $this->artisan('marketing:process-commission-payouts', ['--date' => '2026-05-10'])
            ->assertSuccessful();

        $batch = MarketerPayoutBatch::query()->first();
        $this->assertNotNull($batch);
        $ref = $batch->reference_id;

        $this->postJson('/api/v1/webhooks/xendit/payout', [
            'id' => 'wh_no_amount',
            'event' => 'payout.succeeded',
            'data' => [
                'id' => 'disb_test_no_amt_wh',
                'reference_id' => $ref,
                'status' => 'SUCCEEDED',
                'currency' => 'PHP',
            ],
        ], ['x-callback-token' => 'test-verify-token'])
            ->assertSuccessful();

        $seed['commission']->refresh();
        $this->assertSame('released', $seed['commission']->status);
        $this->assertDatabaseHas('commission_releases', [
            'commission_id' => $seed['commission']->id,
            'release_source' => 'xendit',
            'amount' => 225,
        ]);
    }

    public function test_reconcile_command_polls_xendit_and_completes_submitted_batch(): void
    {
        config([
            'services.xendit.secret_key' => 'xnd_development_test_key',
            'services.marketing_payout.reconcile_poll_enabled' => true,
            'services.marketing_payout.reconcile_submitted_poll_after_minutes' => 1,
        ]);

        $seed = $this->seedMarketerWithCommission();

        $batch = MarketerPayoutBatch::query()->create([
            'marketer_id' => $seed['marketer']->id,
            'run_period' => '2026-05',
            'reference_id' => 'ASP-M'.$seed['marketer']->id.'-2026-05-poll',
            'total_amount' => 225,
            'currency' => 'PHP',
            'status' => MarketerPayoutBatch::STATUS_SUBMITTED,
            'xendit_payout_id' => 'disb_poll_test_1234567890123456789',
            'submitted_at' => now()->subMinutes(5),
        ]);

        $seed['commission']->update([
            'payout_batch_id' => $batch->id,
            'status' => 'pending',
        ]);

        MarketerPayoutBatchItem::query()->create([
            'batch_id' => $batch->id,
            'commission_id' => $seed['commission']->id,
            'amount' => 225,
        ]);

        Http::fake([
            'https://api.xendit.co/v2/payouts/*' => Http::response([
                'id' => 'disb_poll_test_1234567890123456789',
                'reference_id' => $batch->reference_id,
                'status' => 'SUCCEEDED',
                'amount' => 225,
                'currency' => 'PHP',
            ], 200),
        ]);

        $this->artisan('marketing:reconcile-payout-batches')->assertSuccessful();

        $seed['commission']->refresh();
        $this->assertSame('released', $seed['commission']->status);
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

    public function test_batch_creation_snapshots_destination_and_holder_to_prevent_post_batch_redirection(): void
    {
        config([
            'services.marketing_payout.enabled' => true,
            'services.xendit.secret_key' => 'xnd_development_test_key',
            'services.xendit.webhook_token' => 'test-verify-token',
        ]);

        $seed = $this->seedMarketerWithCommission();

        Http::fake([
            'https://api.xendit.co/v2/payouts' => Http::response([
                'id' => 'disb_snapshot_1',
                'status' => 'ACCEPTED',
                'reference_id' => 'PLACEHOLDER',
            ], 200),
        ]);

        $this->artisan('marketing:process-commission-payouts', ['--date' => '2026-05-10'])
            ->assertSuccessful();

        $batch = MarketerPayoutBatch::query()->first();
        $this->assertNotNull($batch);
        $this->assertSame('09123456789', $batch->gcash_account_number_snapshot);
        $this->assertSame('6789', $batch->gcash_last4_snapshot);
        $this->assertSame('Test Marketer', $batch->gcash_account_holder_name_snapshot);
        $this->assertNotNull($batch->marketer_email_snapshot);

        $this->assertDatabaseHas('marketer_payout_batch_items', [
            'batch_id' => $batch->id,
            'commission_id' => $seed['commission']->id,
            'gross_commission_snapshot' => 250,
        ]);
    }

    public function test_transient_xendit_failure_keeps_batch_pending_submit_for_idempotent_retry(): void
    {
        config([
            'services.marketing_payout.enabled' => true,
            'services.xendit.secret_key' => 'xnd_development_test_key',
            'services.xendit.webhook_token' => 'test-verify-token',
        ]);

        $this->seedMarketerWithCommission();

        // First call: simulate a transient 504 (gateway timeout). Batch must NOT be aborted —
        // aborting + recreating with a new reference_id would create a different idempotency
        // key on Xendit's side and risk double-pay if the original POST had actually landed.
        Http::fakeSequence('https://api.xendit.co/v2/payouts')
            ->push(['message' => 'gateway timeout'], 504)
            ->push([
                'id' => 'disb_after_retry',
                'status' => 'ACCEPTED',
                'reference_id' => 'PLACEHOLDER',
            ], 200);

        $this->artisan('marketing:process-commission-payouts', ['--date' => '2026-05-10']);

        $batch = MarketerPayoutBatch::query()->first();
        $this->assertNotNull($batch);
        $this->assertSame(MarketerPayoutBatch::STATUS_PENDING_SUBMIT, $batch->status);
        $this->assertSame(1, (int) $batch->submit_attempts);
        $this->assertNotNull($batch->last_attempt_error);

        // Items must be preserved (not deleted) so we keep the audit trail.
        $this->assertSame(1, $batch->items()->count());
        $this->assertNull($batch->items()->first()->cancelled_at);

        // Second pass via reconciler must reuse the SAME reference_id (idempotency-key) —
        // critical: this is exactly the property that prevents double-pay.
        config(['services.marketing_payout.recover_pending_submit_after_minutes' => 0]);
        config(['services.marketing_payout.retry_backoff_base_minutes' => 0]);
        // Use raw DB update so created_at actually moves (Eloquent ignores it on update by default).
        \Illuminate\Support\Facades\DB::table('marketer_payout_batches')
            ->where('id', $batch->id)
            ->update([
                'created_at' => now()->subHour(),
                'last_attempt_at' => now()->subHour(),
            ]);

        $this->artisan('marketing:reconcile-payout-batches')->assertSuccessful();

        $batch->refresh();
        $this->assertSame(MarketerPayoutBatch::STATUS_SUBMITTED, $batch->status);
        $this->assertSame('disb_after_retry', $batch->xendit_payout_id);
        $this->assertSame(2, (int) $batch->submit_attempts);
    }

    public function test_failed_batch_keeps_items_as_audit_trail(): void
    {
        config([
            'services.marketing_payout.enabled' => true,
            'services.xendit.secret_key' => 'xnd_development_test_key',
            'services.xendit.webhook_token' => 'test-verify-token',
        ]);

        $seed = $this->seedMarketerWithCommission();

        Http::fake([
            'https://api.xendit.co/v2/payouts' => Http::response([
                'id' => 'disb_failed_keep',
                'status' => 'ACCEPTED',
                'reference_id' => 'PLACEHOLDER',
            ], 200),
        ]);

        $this->artisan('marketing:process-commission-payouts', ['--date' => '2026-05-10']);
        $batch = MarketerPayoutBatch::query()->first();
        $ref = $batch->reference_id;

        // Xendit returns FAILED via webhook.
        $this->postJson('/api/v1/webhooks/xendit/payout', [
            'id' => 'wh_fail_keep',
            'event' => 'payout.failed',
            'data' => [
                'id' => 'disb_failed_keep',
                'reference_id' => $ref,
                'status' => 'FAILED',
                'failure_code' => 'RECIPIENT_ACCOUNT_NUMBER_INVALID',
            ],
        ], ['x-callback-token' => 'test-verify-token'])->assertSuccessful();

        $batch->refresh();
        $this->assertSame(MarketerPayoutBatch::STATUS_FAILED, $batch->status);

        // Item is soft-cancelled, NOT deleted — forensic record preserved.
        $this->assertSame(1, $batch->items()->count());
        $this->assertNotNull($batch->items()->first()->cancelled_at);

        // Commission unlocked for re-batching.
        $seed['commission']->refresh();
        $this->assertNull($seed['commission']->payout_batch_id);
        $this->assertSame('pending', $seed['commission']->status);
    }

    public function test_kyc_gate_blocks_payout_when_required_and_missing(): void
    {
        config([
            'services.marketing_payout.enabled' => true,
            'services.marketing_payout.require_kyc' => true,
            'services.xendit.secret_key' => 'xnd_development_test_key',
        ]);

        $seed = $this->seedMarketerWithCommission();
        // No marketer_gov_id_document_url on the seeded marketer.

        $this->artisan('marketing:process-commission-payouts', ['--date' => '2026-05-10'])
            ->assertSuccessful();

        $this->assertSame(0, MarketerPayoutBatch::query()->count());
        $seed['commission']->refresh();
        $this->assertNull($seed['commission']->payout_batch_id);
    }

    public function test_name_match_gate_blocks_when_holder_differs(): void
    {
        config([
            'services.marketing_payout.enabled' => true,
            'services.marketing_payout.require_name_match' => true,
            'services.marketing_payout.name_match_threshold' => 70,
            'services.xendit.secret_key' => 'xnd_development_test_key',
        ]);

        $seed = $this->seedMarketerWithCommission();
        $seed['marketer']->update([
            'name' => 'Juan Dela Cruz',
            'gcash_account_holder_name' => 'Acme Mule Corp',
        ]);

        $this->artisan('marketing:process-commission-payouts', ['--date' => '2026-05-10'])
            ->assertSuccessful();

        $this->assertSame(0, MarketerPayoutBatch::query()->count());
    }

    public function test_finalize_refuses_to_release_commission_detached_from_batch(): void
    {
        config([
            'services.marketing_payout.enabled' => true,
            'services.xendit.secret_key' => 'xnd_development_test_key',
            'services.xendit.webhook_token' => 'test-verify-token',
        ]);

        $seed = $this->seedMarketerWithCommission();

        Http::fake([
            'https://api.xendit.co/v2/payouts' => Http::response([
                'id' => 'disb_detach_test',
                'status' => 'ACCEPTED',
                'reference_id' => 'PLACEHOLDER',
            ], 200),
        ]);

        $this->artisan('marketing:process-commission-payouts', ['--date' => '2026-05-10']);
        $batch = MarketerPayoutBatch::query()->first();
        $ref = $batch->reference_id;

        // Simulate a parallel admin manual release that detaches the commission.
        $seed['commission']->update(['payout_batch_id' => null]);

        // Webhook arrives — should refuse, mark batch failed (not release).
        $this->postJson('/api/v1/webhooks/xendit/payout', [
            'id' => 'wh_detach',
            'event' => 'payout.succeeded',
            'data' => [
                'id' => 'disb_detach_test',
                'reference_id' => $ref,
                'status' => 'SUCCEEDED',
                'amount' => 225,
            ],
        ], ['x-callback-token' => 'test-verify-token'])->assertSuccessful();

        $batch->refresh();
        $this->assertSame(MarketerPayoutBatch::STATUS_FAILED, $batch->status);
        $this->assertSame(0, CommissionRelease::query()
            ->where('commission_id', $seed['commission']->id)
            ->where('release_source', 'xendit')
            ->count());
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
