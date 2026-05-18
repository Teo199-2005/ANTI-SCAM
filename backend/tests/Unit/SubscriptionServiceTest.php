<?php

namespace Tests\Unit;

use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Services\EmailNotificationService;
use App\Support\SubscriptionPlan;
use Tests\TestCase;

class SubscriptionServiceTest extends TestCase
{
    public function test_standard_plan_pricing(): void
    {
        $svc = new SubscriptionService(
            $this->createMock(AuditLogService::class),
            $this->createMock(EmailNotificationService::class)
        );
        $res = $svc->calculateMonthlyBilling(SubscriptionPlan::STANDARD, 2);
        $this->assertEquals(SubscriptionPlan::STANDARD, $res['plan']);
        $this->assertEquals(0.0, $res['base_price']);
        $this->assertEquals(10, $res['included_rooms']);
        $this->assertEquals(0.0, $res['total_monthly_fee']);
    }

    public function test_business_pro_plan_pricing(): void
    {
        $svc = new SubscriptionService(
            $this->createMock(AuditLogService::class),
            $this->createMock(EmailNotificationService::class)
        );
        $res = $svc->calculateMonthlyBilling(SubscriptionPlan::BUSINESS_PRO, 5);
        $this->assertEquals(SubscriptionPlan::BUSINESS_PRO, $res['plan']);
        $this->assertEquals(1000.0, $res['base_price']);
        $this->assertEquals(20, $res['included_rooms']);
        $this->assertEquals(1000.0, $res['total_monthly_fee']);
    }

    public function test_legacy_plan_aliases_normalize(): void
    {
        $svc = new SubscriptionService(
            $this->createMock(AuditLogService::class),
            $this->createMock(EmailNotificationService::class)
        );
        $res = $svc->calculateMonthlyBilling('premium', 1);
        $this->assertEquals(SubscriptionPlan::BUSINESS_PRO, $res['plan']);
        $this->assertEquals(20, $res['included_rooms']);
    }
}
