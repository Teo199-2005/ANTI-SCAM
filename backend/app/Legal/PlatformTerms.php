<?php

namespace App\Legal;

/**
 * Canonical Anti-Scam PH Terms & Conditions (Resort Owner / platform use).
 */
final class PlatformTerms
{
    public const VERSION = '2026-05';

    public const LAST_UPDATED_LABEL = 'May 2026';

    public static function version(): string
    {
        return self::VERSION;
    }

    /** @return list<array{title: string, paragraphs: list<string>, bullets?: list<string>, closing_paragraphs?: list<string>}> */
    public static function sections(): array
    {
        return [
            [
                'title' => '1. Acceptance of terms',
                'paragraphs' => [
                    'By registering, subscribing, onboarding, or using the Anti-Scam PH platform, the Resort Owner (“Client,” “Resort,” or “Subscriber”) agrees to comply with and be legally bound by these Terms and Conditions.',
                    'If the Client does not agree with any part of these Terms, the Client must discontinue the use of the platform immediately.',
                ],
            ],
            [
                'title' => '2. Platform services',
                'paragraphs' => [
                    'Anti-Scam PH provides a resort reservation management and verification platform which may include:',
                ],
                'bullets' => [
                    'Smart reservation system',
                    'Automated booking management',
                    'Reservation calendar synchronization',
                    'Double-booking prevention tools',
                    'Dedicated resort booking pages',
                    'Guest inquiry management',
                    'Financial and reservation reporting',
                    'Verification services',
                    'Listing exposure within the Anti-Scam PH network',
                ],
                'closing_paragraphs' => [
                    'Subscription fees paid by the Client are strictly for access to the platform, software services, operational tools, and membership features provided by Anti-Scam PH.',
                ],
            ],
            [
                'title' => '3. Platform fee',
                'paragraphs' => [
                    'Anti-Scam PH charges a fixed platform processing fee of ₱500.00 per successful reservation processed through the platform.',
                    'This fee serves as the official platform processing and operational fee.',
                    'Anti-Scam PH does not collect commission percentages based on room rates or resort revenue.',
                ],
            ],
            [
                'title' => '4. Payment handling disclaimer',
                'paragraphs' => [
                    'Anti-Scam PH does not directly operate as a payment processor, escrow company, bank, financing institution, or insurance company.',
                    'Resort Owners remain fully responsible for:',
                ],
                'bullets' => [
                    'Their own payment collection',
                    'Guest payment arrangements',
                    'Refund policies',
                    'Reservation disputes',
                    'Guest accommodation obligations',
                    'Resort operations and services',
                ],
                'closing_paragraphs' => [
                    'The platform only facilitates reservation management and booking coordination services.',
                ],
            ],
            [
                'title' => '5. No-show policy',
                'paragraphs' => [
                    'In the event that a confirmed guest fails to appear or complete their reservation without proper cancellation (“No-Show”), the ₱500.00 platform processing fee shall be released or credited to the Resort Owner as compensation for reservation allocation and operational inconvenience.',
                    'Additional damages, penalties, or refund arrangements between the Resort Owner and Guest shall remain solely under the Resort Owner’s own policies and discretion.',
                ],
            ],
            [
                'title' => '6. Verification services',
                'paragraphs' => [
                    'Anti-Scam PH may offer verification services including:',
                ],
                'bullets' => [
                    'Video call verification',
                    'Document verification',
                    'Manual business validation',
                    'Physical or remote inspection procedures',
                ],
                'closing_paragraphs' => [
                    'Verification badges are granted solely based on the platform’s internal verification procedures.',
                    'Anti-Scam PH reserves the right to deny verification requests, suspend verification status, remove verification badges, or request additional documentation if suspicious, misleading, fraudulent, or inaccurate information is discovered.',
                    'Verification status does not constitute insurance, legal guarantee, accreditation, government certification, or warranty of business performance.',
                ],
            ],
            [
                'title' => '7. Resort owner responsibilities',
                'paragraphs' => [
                    'The Resort Owner agrees to provide accurate business information, maintain updated pricing and availability, honor confirmed reservations, avoid fraudulent or misleading advertisements, respond professionally to guests, and maintain lawful business operations.',
                    'The Resort Owner shall remain fully responsible for resort facilities, guest safety, service quality, taxes and permits, legal compliance, staff conduct, and property maintenance.',
                ],
            ],
            [
                'title' => '8. Subscription terms',
                'paragraphs' => [
                    'Subscriptions are billed according to the selected membership plan.',
                    'Failure to maintain active subscription payments may result in suspension of listing visibility, restricted platform access, removal of booking functionality, or deactivation of resort pages.',
                    'Founding partner promotional pricing may only remain active while the subscription remains continuously active and in good standing.',
                ],
            ],
            [
                'title' => '9. Referral program',
                'paragraphs' => [
                    'Referral incentives, free months, promotional offers, and onboarding discounts may be modified, suspended, or terminated by Anti-Scam PH at any time without prior notice.',
                    'Abuse of referral systems, fake referrals, fraudulent registrations, or manipulation of promotional campaigns may result in account suspension or termination.',
                ],
            ],
            [
                'title' => '10. Platform availability',
                'paragraphs' => [
                    'Anti-Scam PH aims to maintain continuous platform availability but does not guarantee uninterrupted operation.',
                    'Temporary downtime may occur due to maintenance, server upgrades, technical issues, Internet interruptions, third-party provider failures, or force majeure events.',
                ],
            ],
            [
                'title' => '11. Limitation of liability',
                'paragraphs' => [
                    'Anti-Scam PH shall not be held liable for resort operational failures, guest dissatisfaction, payment disputes, cancellations, loss of revenue, fraudulent guest activities, natural disasters, force majeure events, Internet interruptions, or unauthorized account access caused by client negligence.',
                    'The Client agrees that the use of the platform is at their own business discretion and risk.',
                ],
            ],
            [
                'title' => '12. Business hours and support',
                'paragraphs' => [
                    'Official support hours are Monday to Friday, 9:00 AM to 4:00 PM, Philippine Standard Time (PST).',
                    'Response times outside official business hours may vary.',
                ],
            ],
            [
                'title' => '13. Termination of services',
                'paragraphs' => [
                    'Anti-Scam PH reserves the right to suspend or terminate accounts involved in fraudulent activities, fake listings, illegal operations, abuse of the platform, harassment, non-payment, or activities that may damage the integrity of the platform.',
                ],
            ],
            [
                'title' => '14. Modifications to terms',
                'paragraphs' => [
                    'Anti-Scam PH reserves the right to update, modify, or revise these Terms and Conditions at any time.',
                    'Continued use of the platform after modifications constitutes acceptance of the updated Terms.',
                ],
            ],
            [
                'title' => '15. Governing law',
                'paragraphs' => [
                    'These Terms and Conditions shall be governed by and interpreted in accordance with the laws of the Republic of the Philippines.',
                    'Any disputes arising from the use of the platform shall be subject to the proper courts within the Philippines.',
                ],
            ],
            [
                'title' => '16. Contact information',
                'paragraphs' => [
                    'Anti-Scam PH — Operated by The Rising 2 Brothers OPC',
                    'Business hours: Monday to Friday, 9:00 AM – 4:00 PM (PST)',
                    'Email: support@anti-scamph.com',
                    'Website: https://anti-scamph.com',
                ],
            ],
        ];
    }

    /** API / JSON payload for the marketing site. */
    public static function publicPayload(): array
    {
        return [
            'document_title' => 'Terms and Conditions Agreement',
            'product_name' => 'Anti-Scam PH',
            'operator' => 'The Rising 2 Brothers OPC',
            'established' => '2024',
            'version' => self::VERSION,
            'last_updated' => self::LAST_UPDATED_LABEL,
            'sections' => self::sections(),
        ];
    }

    public static function emailSummaryLine(string $contextLabel): string
    {
        return 'You accepted the Anti-Scam PH Terms & Conditions (version '.self::VERSION.', '.self::LAST_UPDATED_LABEL.") via {$contextLabel}. A copy of the full agreement is included below for your records.";
    }

    public static function toEmailHtml(): string
    {
        $blocks = [];
        foreach (self::sections() as $section) {
            $title = htmlspecialchars($section['title'], ENT_QUOTES, 'UTF-8');
            $inner = "<h3 style=\"margin:20px 0 8px;font-size:15px;color:#1E3A5F\">{$title}</h3>";
            foreach ($section['paragraphs'] as $p) {
                $pt = htmlspecialchars($p, ENT_QUOTES, 'UTF-8');
                $inner .= "<p style=\"margin:0 0 10px;line-height:1.55;color:#374151;font-size:14px\">{$pt}</p>";
            }
            if (! empty($section['bullets'])) {
                $inner .= '<ul style="margin:0 0 10px 18px;padding:0;line-height:1.5;color:#374151;font-size:14px">';
                foreach ($section['bullets'] as $b) {
                    $bt = htmlspecialchars($b, ENT_QUOTES, 'UTF-8');
                    $inner .= "<li style=\"margin-bottom:4px\">{$bt}</li>";
                }
                $inner .= '</ul>';
            }
            foreach ($section['closing_paragraphs'] ?? [] as $p) {
                $pt = htmlspecialchars($p, ENT_QUOTES, 'UTF-8');
                $inner .= "<p style=\"margin:0 0 10px;line-height:1.55;color:#374151;font-size:14px\">{$pt}</p>";
            }
            $blocks[] = $inner;
        }

        $body = implode('', $blocks);

        return <<<HTML
<div style="font-family:sans-serif;max-width:640px;margin:auto;padding:8px 0">
  <p style="font-size:13px;color:#6b7280;margin-bottom:16px">This message confirms your acceptance of our Terms & Conditions. Please retain this email for your records.</p>
  {$body}
</div>
HTML;
    }
}
