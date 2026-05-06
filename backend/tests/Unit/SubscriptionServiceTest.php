<?php

namespace Tests\Unit;

use App\Modules\Subscriptions\Services\SubscriptionService;
use PHPUnit\Framework\TestCase;

class SubscriptionServiceTest extends TestCase
{
    public function test_basic_plan_pricing()
    {
        $svc = new SubscriptionService($this->createMock(\App\Modules\Audit\Services\AuditLogService::class));
        $res = $svc->calculateMonthlyBilling('basic', 2);
        $this->assertEquals(1300.00, $res['base_price']);
        $this->assertEquals(3, $res['included_rooms']);
        $this->assertEquals(1300.00, $res['total_monthly_fee']);

        // extra room
        $res2 = $svc->calculateMonthlyBilling('basic', 5);
        $this->assertEquals(1300.00 + 2 * 300.00, $res2['total_monthly_fee']);
    }

    public function test_premium_plan_pricing()
    {
        $svc = new SubscriptionService($this->createMock(\App\Modules\Audit\Services\AuditLogService::class));
        $res = $svc->calculateMonthlyBilling('premium', 6);
        $this->assertEquals(2500.00, $res['base_price']);
        $this->assertEquals(6, $res['included_rooms']);
        $this->assertEquals(2500.00, $res['total_monthly_fee']);

        $res2 = $svc->calculateMonthlyBilling('premium', 8);
        $this->assertEquals(2500.00 + 2 * 400.00, $res2['total_monthly_fee']);
    }

    public function test_vip_plan_pricing()
    {
        $svc = new SubscriptionService($this->createMock(\App\Modules\Audit\Services\AuditLogService::class));
        $res = $svc->calculateMonthlyBilling('vip', 10);
        $this->assertEquals(5000.00, $res['base_price']);
        $this->assertEquals(10, $res['included_rooms']);
        $this->assertEquals(5000.00, $res['total_monthly_fee']);

        $res2 = $svc->calculateMonthlyBilling('vip', 12);
        $this->assertEquals(5000.00 + 2 * 500.00, $res2['total_monthly_fee']);
    }
}
