<?php

namespace App\Console\Commands;

use App\Models\Resort;
use App\Modules\Subscriptions\Services\SubscriptionService;
use Illuminate\Console\Command;

class BackfillSubscriptions extends Command
{
    protected $signature = 'resort:backfill-subscriptions {--dry-run}';
    protected $description = 'Create missing subscription records for resorts using current pricing rules.';

    public function handle(SubscriptionService $subscriptions): int
    {
        $dry = $this->option('dry-run');
        $resorts = Resort::query()->get();
        $count = 0;

        foreach ($resorts as $resort) {
            $existing = $resort->subscription()->first();
            if ($existing) {
                $this->line("Skipping resort {$resort->id} ({$resort->name}) - subscription exists");
                continue;
            }

            $roomCount = $resort->rooms()->where('status', 'active')->count();
            $plan = 'basic';
            $pricing = $subscriptions->calculateMonthlyBilling($plan, $roomCount);

            $this->line("Will create subscription for resort {$resort->id} ({$resort->name}) - plan={$plan}, included={$pricing['included_rooms']}, rooms={$roomCount}");

            if (!$dry) {
                $subscription = $resort->subscription()->create([
                    'tenant_id' => $resort->tenant_id,
                    'plan' => $pricing['plan'] ?? $plan,
                    'base_price' => $pricing['base_price'],
                    'included_rooms' => $pricing['included_rooms'],
                    'extra_room_fee' => $pricing['extra_room_fee'],
                    'active_room_count' => $roomCount,
                    'total_monthly_fee' => $pricing['total_monthly_fee'],
                    'billing_cycle_start' => now()->startOfMonth()->toDateString(),
                    'billing_cycle_end' => now()->endOfMonth()->toDateString(),
                    'next_due_date' => now()->endOfMonth()->toDateString(),
                    'status' => 'pending_payment',
                ]);

                $count++;
            }
        }

        $this->info("Processed: {$count} subscriptions created.");
        return 0;
    }
}
