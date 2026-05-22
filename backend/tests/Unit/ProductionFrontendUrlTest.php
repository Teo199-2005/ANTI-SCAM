<?php

namespace Tests\Unit;

use App\Support\ProductionFrontendUrl;
use Illuminate\Http\Request;
use Tests\TestCase;

class ProductionFrontendUrlTest extends TestCase
{
    public function test_production_replaces_localhost_with_app_url(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        config([
            'app.frontend_url' => 'http://localhost:3000',
            'app.url' => 'https://anti-scamph.com',
        ]);

        $request = Request::create('/auth/google/callback', 'GET', [], [], [], [
            'HTTP_X_FORWARDED_HOST' => 'anti-scamph.com',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);

        $out = ProductionFrontendUrl::sanitize('http://localhost:3000', $request);

        $this->assertSame('https://anti-scamph.com', $out);
    }
}
