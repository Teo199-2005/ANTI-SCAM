<?php

namespace App\Console\Commands;

use App\Models\BookingLock;
use App\Models\Reservation;
use App\Services\RoomStayGuard;
use Illuminate\Console\Command;

class ExpireBookingLocks extends Command
{
    protected $signature   = 'booking:expire-locks';
    protected $description = 'Release expired booking locks and mark stale pending-payment reservations as expired';

    public function handle(): int
    {
        $released = BookingLock::withoutGlobalScopes()
            ->where('status', 'locked')
            ->where('expires_at', '<', now())
            ->update(['status' => 'released']);

        // Mark reservations that have no invoice and have been pending for >15 min as expired
        $expired = Reservation::withoutGlobalScopes()
            ->where('status', 'pending_payment')
            ->where('reserved_at', '<', now()->subMinutes(15))
            ->whereNull('xendit_invoice_id')
            ->update(['status' => 'expired']);

        $collapsed = RoomStayGuard::collapseDuplicatePendingStays();
        $overlapCleared = RoomStayGuard::expirePendingOverlappingConfirmed();

        $this->info("Released {$released} expired locks. Expired {$expired} stale reservations. Collapsed {$collapsed} duplicate pending rows. Cleared {$overlapCleared} pending overlaps on confirmed stays.");

        return Command::SUCCESS;
    }
}
