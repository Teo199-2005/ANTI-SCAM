<?php

namespace Tests\Unit;

use App\Modules\Billing\Support\XenditMode;
use Tests\TestCase;

class XenditModeTest extends TestCase
{
    public function test_detects_production_and_development_key_prefixes(): void
    {
        $this->assertSame(XenditMode::LIVE, XenditMode::fromSecretKey('xnd_production_abc'));
        $this->assertSame(XenditMode::TEST, XenditMode::fromSecretKey('xnd_development_xyz'));
        $this->assertSame(XenditMode::UNSET, XenditMode::fromSecretKey(''));
        $this->assertSame(XenditMode::UNSET, XenditMode::fromSecretKey('invalid'));
    }
}
