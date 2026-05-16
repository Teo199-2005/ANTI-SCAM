<?php

namespace Tests\Unit;

use App\Modules\Reservations\Services\ReservationService;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Services\EmailNotificationService;
use App\Modules\Audit\Services\AuditLogService;
use Tests\TestCase;

class PricingPilotTest extends TestCase
{
    public function test_reservation_fee_returns_pilot_unit_and_skips_db(): void
    {
        config([
            'pricing.pilot_mode' => true,
            'pricing.pilot_amount_php' => 1.25,
        ]);

        $this->assertEqualsWithDelta(1.25, ReservationService::reservationFeeAmount(), 0.00001);
    }

    public function test_subscription_monthly_billing_uses_pilot_amounts(): void
    {
        config([
            'pricing.pilot_mode' => true,
            'pricing.pilot_amount_php' => 1,
        ]);

        $svc = new SubscriptionService(
            $this->createMock(AuditLogService::class),
            $this->createMock(EmailNotificationService::class)
        );

        $r = $svc->calculateMonthlyBilling('basic', 5);
        $this->assertSame(1.0, (float) $r['base_price']);
        $this->assertSame(1.0, (float) $r['extra_room_fee']);
        $this->assertSame(3.0, (float) $r['total_monthly_fee']);
    }
}
