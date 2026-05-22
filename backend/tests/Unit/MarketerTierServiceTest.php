<?php

namespace Tests\Unit;

use App\Services\MarketerTierService;
use Tests\TestCase;

class MarketerTierServiceTest extends TestCase
{
    public function test_service_is_referral_funnel_counter_only(): void
    {
        $tiers = new MarketerTierService;

        $this->assertTrue(method_exists($tiers, 'countConvertingClients'));
        $this->assertTrue(method_exists($tiers, 'countDistinctReferredResorts'));
        $this->assertFalse(method_exists($tiers, 'resolveTier'));
        $this->assertFalse(method_exists($tiers, 'tierLadder'));
    }
}
