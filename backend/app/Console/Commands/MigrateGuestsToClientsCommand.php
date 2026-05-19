<?php

namespace App\Console\Commands;

use App\Models\Reservation;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateGuestsToClientsCommand extends Command
{
    protected $signature = 'users:migrate-guests-to-clients {--dry-run : Report counts without writing}';

    protected $description = 'Migrate legacy guest users to universal client accounts and backfill client_id on reservations';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $guestQuery = User::query()->where('role', 'guest');
        $guestCount = (clone $guestQuery)->count();

        $this->info("Found {$guestCount} guest user(s) to migrate.");

        if ($guestCount === 0) {
            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->warn('Dry run — no changes written.');

            return self::SUCCESS;
        }

        $backfilled = 0;

        DB::transaction(function () use ($guestQuery, &$backfilled): void {
            $guestQuery->orderBy('id')->chunkById(100, function ($guests) use (&$backfilled): void {
                foreach ($guests as $guest) {
                    $email = mb_strtolower(trim((string) $guest->email));
                    if ($email !== '') {
                        $updated = Reservation::query()
                            ->whereNull('client_id')
                            ->where(function ($q) use ($guest, $email): void {
                                $q->where('guest_email', $email)
                                    ->orWhereRaw('lower(guest_email) = ?', [$email]);
                            })
                            ->update(['client_id' => $guest->id]);
                        $backfilled += $updated;
                    }

                    $guest->forceFill([
                        'role' => 'client',
                        'home_resort_id' => null,
                    ])->save();
                }
            });
        });

        $this->info("Migrated {$guestCount} user(s) to client.");
        $this->info("Backfilled client_id on {$backfilled} reservation(s).");

        return self::SUCCESS;
    }
}
