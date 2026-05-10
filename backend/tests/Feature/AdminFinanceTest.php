<?php

namespace Tests\Feature;

use App\Models\Commission;
use App\Models\MarketerPayoutBatch;
use App\Models\MarketerPayoutBatchItem;
use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminFinanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_finance_overview(): void
    {
        $owner = User::factory()->create(['role' => 'resort_owner']);
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/admin/finance/overview')->assertForbidden();
    }

    public function test_admin_finance_overview_and_ledger_return_success(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/finance/overview')
            ->assertSuccessful()
            ->assertJsonPath('data.withholding_rate', fn ($v) => is_numeric($v));

        $this->getJson('/api/v1/admin/finance/payment-ledger?per_page=5')
            ->assertSuccessful()
            ->assertJsonStructure(['data' => ['data', 'current_page', 'per_page']]);

        $this->getJson('/api/v1/admin/finance/commissions?per_page=5')
            ->assertSuccessful()
            ->assertJsonStructure(['data' => ['summary', 'commissions']]);

        $this->getJson('/api/v1/admin/finance/withholding-batches?per_page=5')
            ->assertSuccessful()
            ->assertJsonStructure(['data' => ['summary', 'batches']]);

        $this->getJson('/api/v1/admin/finance/commission-releases?per_page=5')
            ->assertSuccessful();
    }

    public function test_withholding_batch_lists_gross_and_withheld(): void
    {
        $tenant = Tenant::create([
            'name' => 'Fin Tenant',
            'slug' => 'fin-tenant',
            'subdomain' => 'fin',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Fin Resort',
            'is_publicly_listed' => true,
        ]);

        $marketer = User::factory()->create(['role' => 'marketing']);

        $commission = Commission::query()->create([
            'marketer_id' => $marketer->id,
            'resort_id' => $resort->id,
            'period' => '2026-05',
            'gross_bookings' => 0,
            'commission_rate' => 0,
            'commission_amount' => 100,
            'status' => 'pending',
        ]);

        $batch = MarketerPayoutBatch::query()->create([
            'marketer_id' => $marketer->id,
            'run_period' => '2026-05',
            'reference_id' => 'test-ref-1',
            'total_amount' => 90,
            'currency' => 'PHP',
            'status' => MarketerPayoutBatch::STATUS_SUCCEEDED,
            'submitted_at' => now(),
            'completed_at' => now(),
        ]);

        $commission->update(['payout_batch_id' => $batch->id, 'status' => 'released']);

        MarketerPayoutBatchItem::query()->create([
            'batch_id' => $batch->id,
            'commission_id' => $commission->id,
            'amount' => 90,
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/finance/withholding-batches?per_page=10')
            ->assertSuccessful()
            ->assertJsonFragment([
                'gross_commissions' => 100.0,
                'net_disbursed' => 90.0,
                'withheld' => 10.0,
            ]);
    }

    public function test_manual_commission_release_records_net_after_withholding(): void
    {
        config(['services.marketing_payout.withholding_rate' => 0.10]);

        $tenant = Tenant::create([
            'name' => 'Rel Tenant',
            'slug' => 'rel-tenant',
            'subdomain' => 'rel',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Rel Resort',
            'is_publicly_listed' => true,
        ]);

        $marketer = User::factory()->create(['role' => 'marketing']);

        $commission = Commission::query()->create([
            'marketer_id' => $marketer->id,
            'resort_id' => $resort->id,
            'period' => '2026-06',
            'gross_bookings' => 0,
            'commission_rate' => 0,
            'commission_amount' => 100,
            'status' => 'pending',
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/commissions/{$commission->id}/release", [
            'notes' => 'Test payout',
        ])->assertSuccessful();

        $this->assertDatabaseHas('commission_releases', [
            'commission_id' => $commission->id,
            'amount' => 90,
            'release_source' => 'manual',
        ]);

        $commission->refresh();
        $this->assertSame('released', $commission->status);
    }
}
