<?php

namespace Tests\Unit;

use App\Modules\Billing\Support\SubscriptionInvoicePlanTag;
use PHPUnit\Framework\TestCase;

class SubscriptionInvoicePlanTagTest extends TestCase
{
    public function test_credited_months_from_standard_and_recurring_tags(): void
    {
        $this->assertSame(3, SubscriptionInvoicePlanTag::creditedMonthsFromPlan('basic_m3_b0'));
        $this->assertSame(3, SubscriptionInvoicePlanTag::creditedMonthsFromPlan('basic_m3_b0_rec'));
        $this->assertTrue(SubscriptionInvoicePlanTag::requestsRecurringSetup('basic_m1_b0_rec'));
        $this->assertFalse(SubscriptionInvoicePlanTag::requestsRecurringSetup('basic_m1_b0'));
    }
}
