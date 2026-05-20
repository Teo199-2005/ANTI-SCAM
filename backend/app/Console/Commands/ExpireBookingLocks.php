<?php

namespace App\Console\Commands;

use App\Models\BookingLock;
use App\Services\ReservationCheckoutExpiryService;
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

        $expired = app(ReservationCheckoutExpiryService::class)->expireStalePendingPayments();

        $collapsed = RoomStayGuard::collapseDuplicatePendingStays();
        $overlapCleared = RoomStayGuard::expirePendingOverlappingConfirmed();

        $this->info("Released {$released} expired locks. Expired {$expired} stale reservations. Collapsed {$collapsed} duplicate pending rows. Cleared {$overlapCleared} pending overlaps on confirmed stays.");

        return Command::SUCCESS;
    }
}
