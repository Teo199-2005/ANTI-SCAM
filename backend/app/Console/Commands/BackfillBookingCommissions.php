<?php

namespace App\Console\Commands;

use App\Models\Reservation;
use App\Services\BookingReferralCommissionService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class BackfillBookingCommissions extends Command
{
    protected $signature = 'marketing:backfill-booking-commissions
                            {--since= : Only reservations paid or reserved on/after this date (Y-m-d, Asia/Manila)}
                            {--dry-run : List eligible reservations without crediting}';

    protected $description = 'Backfill marketer booking commissions for historical paid online reservations (optional; forward-only by default).';

    public function handle(BookingReferralCommissionService $commissions): int
    {
        if (! $commissions->isEnabled()) {
            $this->error('MARKETING_BOOKING_COMMISSION_ENABLED is false — enable before backfill.');

            return self::FAILURE;
        }

        $dry = (bool) $this->option('dry-run');
        $sinceOpt = (string) ($this->option('since') ?? '');
        $tz = (string) config('services.marketing_payout.timezone', 'Asia/Manila');
        $since = $sinceOpt !== ''
            ? Carbon::parse($sinceOpt, $tz)->startOfDay()
            : null;

        $q = Reservation::withoutGlobalScopes()
            ->where('booking_source', 'online')
            ->where('status', 'confirmed')
            ->where('xendit_payment_status', 'paid');

        if ($since !== null) {
            $q->where(function ($w) use ($since): void {
                $w->where('paid_at', '>=', $since)
                    ->orWhere(function ($w2) use ($since): void {
                        $w2->whereNull('paid_at')->where('reserved_at', '>=', $since);
                    });
            });
        }

        $total = 0;
        $credited = 0;

        foreach ($q->orderBy('id')->cursor() as $reservation) {
            $total++;
            if ($dry) {
                $this->line(sprintf('reservation #%d resort #%d ref %s', $reservation->id, $reservation->resort_id, $reservation->reference_no ?? '—'));

                continue;
            }

            $before = (int) \App\Models\MarketerBookingCommissionEvent::query()
                ->where('reservation_id', $reservation->id)
                ->where('type', \App\Models\MarketerBookingCommissionEvent::TYPE_CREDIT)
                ->count();

            $commissions->creditFromPaidReservation($reservation->fresh());

            $after = (int) \App\Models\MarketerBookingCommissionEvent::query()
                ->where('reservation_id', $reservation->id)
                ->where('type', \App\Models\MarketerBookingCommissionEvent::TYPE_CREDIT)
                ->count();

            if ($after > $before) {
                $credited++;
            }
        }

        if ($dry) {
            $this->info("Dry-run: {$total} eligible reservation(s).");

            return self::SUCCESS;
        }

        $this->info("Processed {$total} reservation(s); new credits: {$credited}.");

        return self::SUCCESS;
    }
}
