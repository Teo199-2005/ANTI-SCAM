<?php

namespace App\Services;

use App\Support\BrandedMailHtml;

class BrandedEmailTemplateService
{
    public function render(string $title, string $contentHtml, ?string $preheader = null): string
    {
        return view('emails.layout', [
            'title' => $title,
            'preheader' => $preheader,
            'contentHtml' => $contentHtml,
            'brandName' => config('mail.from.name', 'Anti-Scam PH'),
            'logoUrl' => BrandedMailHtml::resolveLogoUrl(),
            'supportEmail' => (string) config('services.mail_brand.support_email', config('mail.from.address')),
            'trademarkLine' => (string) config(
                'services.mail_brand.trademark_line',
                'Anti-Scam PH is a product and service operated by The Rising 2 Brothers OPC.'
            ),
        ])->render();
    }
}

