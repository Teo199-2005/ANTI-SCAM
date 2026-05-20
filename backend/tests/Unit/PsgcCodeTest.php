<?php

namespace Tests\Unit;

use App\Support\PsgcCode;
use PHPUnit\Framework\TestCase;

class PsgcCodeTest extends TestCase
{
    public function test_same_treats_leading_zero_width_variants_as_equal(): void
    {
        $this->assertTrue(PsgcCode::same('1400100000', '01400100000'));
        $this->assertTrue(PsgcCode::same('1400101000', '01400101000'));
    }

    public function test_same_distinguishes_different_places(): void
    {
        $this->assertFalse(PsgcCode::same('1400100000', '1400200000'));
    }
}
