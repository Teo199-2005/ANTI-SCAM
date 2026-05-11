<?php

namespace Tests\Unit;

use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Services\EmailNotificationService;
use PHPUnit\Framework\TestCase;

class SubscriptionServiceTest extends TestCase
{
    public function test_basic_plan_pricing()
    {
        $svc = new SubscriptionService(
            $this->createMock(AuditLogService::class),
            $this->createMock(EmailNotificationService::class)
        );
        $res = $svc->calculateMonthlyBilling('basic', 2);
        $this->assertEquals('basic', $res['plan']);
        $this->assertEquals(2100.00, $res['base_price']);
        $this->assertEquals(3, $res['included_rooms']);
        $this->assertEquals(2100.00, $res['total_monthly_fee']);

        // extra room
        $res2 = $svc->calculateMonthlyBilling('basic', 5);
        $this->assertEquals('basic', $res2['plan']);
        $this->assertEquals(2100.00 + 2 * 300.00, $res2['total_monthly_fee']);
    }

    public function test_non_basic_input_still_uses_single_basic_plan_pricing()
    {
        $svc = new SubscriptionService(
            $this->createMock(AuditLogService::class),
            $this->createMock(EmailNotificationService::class)
        );
        $res = $svc->calculateMonthlyBilling('premium', 6);
        $this->assertEquals('basic', $res['plan']);
        $this->assertEquals(2100.00, $res['base_price']);
        $this->assertEquals(3, $res['included_rooms']);
        $this->assertEquals(2100.00 + 3 * 300.00, $res['total_monthly_fee']);
    }
}
