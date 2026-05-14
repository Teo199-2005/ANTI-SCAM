<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Tests use local fake storage; never hit real R2/S3.
        config(['media.disk' => 'public']);

        // Config cache (if present) can ignore phpunit.xml QUEUE_CONNECTION; keep jobs synchronous in tests.
        config(['queue.default' => 'sync']);
    }
}
