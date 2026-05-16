<?php

namespace Tests\Feature;

use App\Models\EmailLog;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Billing\Support\SubscriptionBillingMode;
use App\Services\SubscriptionExpiryReminderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class SubscriptionExpiryReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_seven_day_manual_and_recurring_reminders_once_per_cycle(): void
    {
        $tenant = Tenant::create([
            'name' => 'Mail Tenant',
            'slug' => 'mail-tenant',
            'subdomain' => 'mailt',
            'status' => 'active',
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Mail Resort',
            'is_publicly_listed' => true,
        ]);

        $endDate = now()->addDays(7)->toDateString();

        $manual = Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort->id,
            'plan' => 'basic',
            'base_price' => 2100,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 1,
            'total_monthly_fee' => 2100,
            'status' => 'active',
            'billing_mode' => SubscriptionBillingMode::MANUAL,
            'renewal_duration_months' => 1,
            'billing_cycle_start' => now()->subMonth()->toDateString(),
            'billing_cycle_end' => $endDate,
            'next_due_date' => $endDate,
        ]);

        $resort2 = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Mail Resort 2',
            'is_publicly_listed' => true,
        ]);

        $auto = Subscription::create([
            'tenant_id' => $tenant->id,
            'resort_id' => $resort2->id,
            'plan' => 'basic',
            'base_price' => 2100,
            'included_rooms' => 3,
            'extra_room_fee' => 300,
            'active_room_count' => 1,
            'total_monthly_fee' => 2100,
            'status' => 'active',
            'billing_mode' => SubscriptionBillingMode::AUTO_CARD,
            'renewal_duration_months' => 3,
            'billing_cycle_start' => now()->subMonths(3)->toDateString(),
            'billing_cycle_end' => $endDate,
            'next_due_date' => $endDate,
            'recurring_activated_at' => now(),
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'resort_owner',
            'email' => 'owner-reminder@example.test',
        ]);

        Artisan::call('subscriptions:send-expiry-reminders');

        $this->assertDatabaseHas('email_logs', [
            'type' => 'subscription_expiry_reminder',
            'to_email' => 'owner-reminder@example.test',
        ]);

        $sevenDayLogs = EmailLog::query()
            ->where('type', 'subscription_expiry_reminder')
            ->where('metadata->days_before', 7)
            ->get();

        $this->assertGreaterThanOrEqual(2, $sevenDayLogs->count());

        $manualLog = $sevenDayLogs->first(fn ($l) => ($l->metadata['billing_mode'] ?? '') === 'manual');
        $autoLog = $sevenDayLogs->first(fn ($l) => ($l->metadata['billing_mode'] ?? '') === 'auto_card');

        $this->assertNotNull($manualLog);
        $this->assertNotNull($autoLog);
        $this->assertStringContainsString('Manual renewal', $manualLog->html_body ?? '');
        $this->assertStringContainsString('Auto-renewal', $autoLog->html_body ?? '');

        $before = EmailLog::query()->where('type', 'subscription_expiry_reminder')->count();
        app(SubscriptionExpiryReminderService::class)->sendDueReminders();
        $after = EmailLog::query()->where('type', 'subscription_expiry_reminder')->count();

        $this->assertSame($before, $after);
    }
}
