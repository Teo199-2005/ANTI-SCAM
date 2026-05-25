<?php

namespace Tests\Unit;

use App\Services\BrandedEmailTemplateService;
use App\Support\BrandedMailHtml;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandedMailHtmlTest extends TestCase
{
    use RefreshDatabase;

    public function test_branded_layout_includes_logo_marker_and_frontend_mainlogo(): void
    {
        config([
            'app.frontend_url' => 'https://anti-scamph.com',
            'services.mail_brand.logo_url' => '',
        ]);

        $this->assertFileExists(public_path('brand/mainlogo.png'));

        $html = app(BrandedEmailTemplateService::class)->render('Test', '<p>Body</p>');

        $this->assertStringContainsString(BrandedMailHtml::LOGO_MARKER, $html);
        $this->assertStringContainsString('https://anti-scamph.com/branding/mainlogo.png', $html);
    }

    public function test_resolve_logo_url_prefers_frontend_mainlogo_png(): void
    {
        config([
            'app.url' => 'https://api.anti-scamph.com',
            'app.frontend_url' => 'https://anti-scamph.com',
            'services.mail_brand.logo_url' => '',
        ]);

        $this->assertSame(
            'https://anti-scamph.com/branding/mainlogo.png',
            BrandedMailHtml::resolveLogoUrl()
        );
    }
}
