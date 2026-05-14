<?php

namespace Tests\Unit;

use App\Modules\Billing\Support\CheckoutReturnBaseResolver;
use Tests\TestCase;

class CheckoutReturnBaseResolverTest extends TestCase
{
    public function test_accepts_origin_matching_app_url_host_when_frontend_url_is_localhost(): void
    {
        config([
            'app.frontend_url' => 'http://127.0.0.1:3000',
            'app.url' => 'https://anti-scamph.test',
            'app.checkout_return_hosts' => [],
        ]);

        $resolver = app(CheckoutReturnBaseResolver::class);

        $this->assertSame('https://anti-scamph.test', $resolver->resolve('https://anti-scamph.test'));
    }

    public function test_rejects_unknown_host_and_falls_back_to_frontend_url(): void
    {
        config([
            'app.frontend_url' => 'http://127.0.0.1:3000',
            'app.url' => 'https://anti-scamph.test',
            'app.checkout_return_hosts' => [],
        ]);

        $resolver = app(CheckoutReturnBaseResolver::class);

        $this->assertSame('http://127.0.0.1:3000', $resolver->resolve('https://evil.example.com'));
    }
}
