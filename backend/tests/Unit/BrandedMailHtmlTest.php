<?php

namespace Tests\Unit;

use App\Services\BrandedEmailTemplateService;
use App\Support\BrandedMailHtml;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandedMailHtmlTest extends TestCase
{
    use RefreshDatabase;

    public function test_branded_layout_includes_logo_marker_and_app_url(): void
    {
        config(['app.url' => 'https://api.anti-scamph.com']);

        $this->assertFileExists(public_path('brand/mainlogo.png'));

        $html = app(BrandedEmailTemplateService::class)->render('Test', '<p>Body</p>');

        $this->assertStringContainsString(BrandedMailHtml::LOGO_MARKER, $html);
        $this->assertStringContainsString('https://api.anti-scamph.com/brand/mainlogo.png', $html);
    }

    public function test_resolve_logo_url_prefers_app_url_brand_asset(): void
    {
        config([
            'app.url' => 'https://api.anti-scamph.com',
            'services.mail_brand.logo_url' => '',
        ]);

        $this->assertSame(
            'https://api.anti-scamph.com/brand/mainlogo.png',
            BrandedMailHtml::resolveLogoUrl()
        );
    }
}
