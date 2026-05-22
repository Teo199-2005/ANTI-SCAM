<?php

namespace Tests\Unit;

use App\Support\FrontendOriginResolver;
use Illuminate\Http\Request;
use Tests\TestCase;

class FrontendOriginResolverTest extends TestCase
{
    public function test_uses_forwarded_host_when_frontend_url_is_localhost(): void
    {
        config([
            'app.frontend_url' => 'http://localhost:3000',
            'app.url' => 'https://anti-scamph.com',
        ]);

        $request = Request::create('/auth/google/redirect', 'GET', [], [], [], [
            'HTTP_X_FORWARDED_HOST' => 'anti-scamph.com',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_HOST' => '127.0.0.1',
        ]);

        $resolved = (new FrontendOriginResolver)->resolve($request);

        $this->assertSame('https://anti-scamph.com', $resolved);
    }

    public function test_falls_back_to_configured_frontend_url_when_no_public_hint(): void
    {
        config(['app.frontend_url' => 'http://127.0.0.1:3000']);

        $request = Request::create('/auth/google/redirect', 'GET', [], [], [], [
            'HTTP_HOST' => '127.0.0.1:3000',
        ]);

        $this->assertSame('http://127.0.0.1:3000', (new FrontendOriginResolver)->resolve($request));
    }
}
