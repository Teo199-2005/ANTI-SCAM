<?php

namespace App\Services;

class BrandedEmailTemplateService
{
    public function render(string $title, string $contentHtml, ?string $preheader = null): string
    {
        $configuredLogo = (string) config('services.mail_brand.logo_url', '');
        $frontendBase = rtrim((string) env('FRONTEND_URL', ''), '/');
        $fallbackLogo = $frontendBase ? "{$frontendBase}/mainlogo.png" : '';
        $logoUrl = $configuredLogo !== '' ? $configuredLogo : $fallbackLogo;

        return view('emails.layout', [
            'title' => $title,
            'preheader' => $preheader,
            'contentHtml' => $contentHtml,
            'brandName' => config('mail.from.name', 'Anti-Scam PH'),
            'logoUrl' => $logoUrl,
            'supportEmail' => (string) config('services.mail_brand.support_email', config('mail.from.address')),
            'trademarkLine' => (string) config(
                'services.mail_brand.trademark_line',
                'Anti-Scam PH is a product and service operated by The Rising 2 Brothers OPC.'
            ),
        ])->render();
    }
}

