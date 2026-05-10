<?php

namespace Tests\Unit;

use App\Services\MarketerTierService;
use Tests\TestCase;

class MarketerTierServiceTest extends TestCase
{
    private MarketerTierService $tiers;

    protected function setUp(): void
    {
        parent::setUp();
        config(['marketing_tiers.emergency_flat_per_payment_php' => null]);
        $this->tiers = new MarketerTierService;
    }

    public function test_resolve_tier_is_null_for_zero_clients(): void
    {
        $this->assertNull($this->tiers->resolveTier(0));
    }

    public function test_silver_tier_boundaries(): void
    {
        foreach ([1, 50, 100] as $n) {
            $t = $this->tiers->resolveTier($n);
            $this->assertNotNull($t);
            $this->assertSame('silver', $t['tier_key']);
            $this->assertSame(150.0, $t['per_payment_php']);
            $this->assertSame(101, $t['next_tier_at']);
            $this->assertSame(101 - $n, $t['clients_to_next_tier']);
        }
    }

    public function test_gold_tier_boundaries(): void
    {
        foreach ([101, 150, 200] as $n) {
            $t = $this->tiers->resolveTier($n);
            $this->assertNotNull($t);
            $this->assertSame('gold', $t['tier_key']);
            $this->assertSame(200.0, $t['per_payment_php']);
            $this->assertSame(201, $t['next_tier_at']);
            $this->assertSame(201 - $n, $t['clients_to_next_tier']);
        }
    }

    public function test_platinum_tier_and_no_next(): void
    {
        foreach ([201, 500] as $n) {
            $t = $this->tiers->resolveTier($n);
            $this->assertNotNull($t);
            $this->assertSame('platinum', $t['tier_key']);
            $this->assertSame(250.0, $t['per_payment_php']);
            $this->assertNull($t['next_tier_at']);
            $this->assertNull($t['clients_to_next_tier']);
        }
    }

    public function test_emergency_flat_overrides_bands(): void
    {
        config(['marketing_tiers.emergency_flat_per_payment_php' => 99.5]);
        $t = $this->tiers->resolveTier(50);
        $this->assertNotNull($t);
        $this->assertSame('emergency_flat', $t['tier_key']);
        $this->assertSame(99.5, $t['per_payment_php']);
    }

    public function test_tier_ladder_has_three_bands(): void
    {
        $ladder = $this->tiers->tierLadder();
        $this->assertCount(3, $ladder);
        $this->assertSame('1–100', $ladder[0]['client_range_label']);
        $this->assertSame('101–200', $ladder[1]['client_range_label']);
        $this->assertSame('201+', $ladder[2]['client_range_label']);
    }
}
