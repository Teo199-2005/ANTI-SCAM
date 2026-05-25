<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Resort;
use App\Models\User;
use App\Services\ResortRegistrationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RepairIncompleteResortRegistrationCommand extends Command
{
    protected $signature = 'resort-registration:repair-incomplete
                            {--dry-run : List owners that would be repaired without calling finish}';

    protected $description = 'Provision resorts for owners who finished registration but have no resort workspace';

    public function handle(ResortRegistrationService $registration): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $owners = User::withoutGlobalScopes()
            ->where('role', 'resort_owner')
            ->whereNotNull('registration_completed_at')
            ->get()
            ->filter(function (User $user): bool {
                if ($user->tenant_id === null) {
                    return true;
                }

                return Resort::withoutGlobalScopes()
                    ->where('tenant_id', $user->tenant_id)
                    ->doesntExist();
            });

        if ($owners->isEmpty()) {
            $this->info('No incomplete resort registrations found.');

            return self::SUCCESS;
        }

        $this->info(sprintf('Found %d owner(s) to repair.', $owners->count()));

        foreach ($owners as $owner) {
            $label = "{$owner->id} {$owner->email}";
            if ($dryRun) {
                $this->line("[dry-run] Would repair: {$label}");
                continue;
            }

            try {
                $registration->finishRegistration($owner);
                $this->info("Repaired: {$label}");
            } catch (\Throwable $e) {
                Log::warning('resort_registration_repair_failed', [
                    'user_id' => $owner->id,
                    'error' => $e->getMessage(),
                ]);
                $this->error("Failed {$label}: {$e->getMessage()}");
            }
        }

        return self::SUCCESS;
    }
}
