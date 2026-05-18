<?php

namespace App\Console\Commands;

use App\Models\Resort;
use App\Models\Subscription;
use App\Modules\Rooms\Services\RoomService;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Support\SubscriptionPlan;
use Illuminate\Console\Command;

class MigrateSubscriptionsToAntiScamphPlans extends Command
{
  protected $signature = 'subscriptions:migrate-anti-scamph {--dry-run : Report only, no writes}';

  protected $description = 'Migrate all subscriptions to Standard (free) with room caps; existing payers must re-upgrade to Business Pro.';

  public function handle(SubscriptionService $subscriptions, RoomService $rooms): int
  {
    $dry = (bool) $this->option('dry-run');
    $count = 0;

    Subscription::query()->orderBy('id')->chunkById(100, function ($rows) use ($dry, $subscriptions, $rooms, &$count): void {
      foreach ($rows as $subscription) {
        $count++;
        if ($dry) {
          $this->line("Would migrate subscription #{$subscription->id} (resort {$subscription->resort_id})");

          continue;
        }

        $subscriptions->downgradeToStandard($subscription, reconcileRooms: false);
        $subscription->refresh();

        if ($subscription->resort_id) {
          $rooms->reconcileResortActiveRooms((int) $subscription->resort_id);
        }
      }
    });

    if (! $dry) {
      Resort::withoutGlobalScopes()
        ->where('is_publicly_listed', false)
        ->update(['is_publicly_listed' => true]);
    }

    $this->info(($dry ? 'Would migrate' : 'Migrated')." {$count} subscription(s) to ".SubscriptionPlan::STANDARD.'.');

    return self::SUCCESS;
  }
}
