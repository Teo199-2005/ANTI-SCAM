<?php

namespace App\Support;

use App\Models\Reservation;
use App\Models\Subscription;

final class PlatformTransactionalEmailContent
{
    public static function greeting(string $name): string
    {
        $safe = htmlspecialchars($name !== '' ? $name : 'Guest', ENT_QUOTES, 'UTF-8');

        return '<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 16px 0">Dear '.$safe.',</p>';
    }

    public static function signature(): string
    {
        return <<<'HTML'
<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:24px 0 0 0">Thank you for choosing <strong>Anti-ScamPH.com</strong>. We hope you enjoy a safe, smooth, and hassle-free resort experience.</p>
<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:16px 0 0 0">Respectfully,<br><strong>Anti-ScamPH.com</strong><br><span style="color:#64748b;font-size:13px">Powered by <strong>The Rising 2 Brothers Solutions OPC</strong></span></p>
HTML;
    }

    public static function sectionTitle(string $title): string
    {
        $safe = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');

        return '<p style="font-size:14px;line-height:1.5;color:#0f172a;margin:20px 0 8px 0"><strong>'.$safe.'</strong></p>';
    }

    public static function detailRow(string $label, string $value): string
    {
        $l = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
        $v = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');

        return '<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:14px;vertical-align:top;width:42%">'.$l.'</td>'
            .'<td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;vertical-align:top">'.$v.'</td></tr>';
    }

    public static function bulletList(array $items): string
    {
        $lis = '';
        foreach ($items as $item) {
            $lis .= '<li style="margin:0 0 10px 0;font-size:14px;line-height:1.55;color:#374151">'
                .htmlspecialchars((string) $item, ENT_QUOTES, 'UTF-8')
                .'</li>';
        }

        return '<ul style="margin:8px 0 0 0;padding-left:20px">'.$lis.'</ul>';
    }

    /**
     * @param  array<int, string>  $htmlItems  Pre-escaped or safe HTML fragments per bullet
     */
    public static function bulletListHtml(array $htmlItems): string
    {
        $lis = '';
        foreach ($htmlItems as $item) {
            $lis .= '<li style="margin:0 0 10px 0;font-size:14px;line-height:1.55;color:#374151">'.$item.'</li>';
        }

        return '<ul style="margin:8px 0 0 0;padding-left:20px">'.$lis.'</ul>';
    }

    /**
     * @param  array<int, string>  $bullets  Plain-text bullets (escaped)
     */
    public static function letterBlock(string $greetingName, string $introHtml, string $detailsTableRows, string $sectionTitle, array $bullets): string
    {
        return self::letterBlockHtml($greetingName, $introHtml, $detailsTableRows, $sectionTitle, array_map(
            fn (string $b) => htmlspecialchars($b, ENT_QUOTES, 'UTF-8'),
            $bullets
        ));
    }

    /**
     * @param  array<int, string>  $bulletHtml  Safe HTML per bullet
     */
    public static function letterBlockHtml(
        string $greetingName,
        string $introHtml,
        string $detailsTableRows,
        string $sectionTitle,
        array $bulletHtml,
    ): string {
        return self::greeting($greetingName)
            .$introHtml
            .self::sectionTitle($sectionTitle)
            .'<table style="width:100%;border-collapse:collapse;margin:0 0 4px 0">'
            .$detailsTableRows
            .'</table>'
            .self::sectionTitle('Important Reminders')
            .self::bulletListHtml($bulletHtml)
            .self::signature();
    }

    public static function subscriptionExpiryReminderBody(
        Subscription $subscription,
        string $ownerName,
        int $daysBefore,
        bool $isAutoCard,
        string $renewalAmountLabel,
        string $dashboardUrl,
    ): string {
        $resortName = (string) ($subscription->resort?->name ?? 'Your resort');
        $plan = strtoupper((string) ($subscription->plan ?? 'basic'));
        $periodEnd = $subscription->billing_cycle_end?->format('F j, Y') ?? '—';
        $renewalMonths = max(1, (int) $subscription->renewal_duration_months);
        $dayWord = $daysBefore === 1 ? '1 day' : $daysBefore.' days';

        if ($isAutoCard) {
            $intro = '<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 12px 0">'
                .'This is a friendly reminder from <strong>Anti-ScamPH.com</strong> about your <strong>resort subscription</strong>. '
                .'Your current billing period ends in <strong>'.$dayWord.'</strong>. '
                .'Your subscription is set to <strong>auto-renew by card</strong> (Visa, Mastercard, or JCB) unless you have cancelled auto-renewal.</p>'
                .'<p style="font-size:14px;line-height:1.55;color:#374151;margin:0 0 8px 0">Please keep this email for your records.</p>';

            $rows = self::detailRow('Resort name', $resortName)
                .self::detailRow('Plan', $plan)
                .self::detailRow('Current period ends', $periodEnd)
                .self::detailRow('Billing', 'Auto-renewal (card)')
                .self::detailRow('Renewal term', $renewalMonths.' month'.($renewalMonths > 1 ? 's' : ''))
                .self::detailRow('Estimated charge', $renewalAmountLabel)
                .self::detailRow('Scheduled renewal date', $periodEnd);

            $dash = htmlspecialchars($dashboardUrl, ENT_QUOTES, 'UTF-8');
            $bullets = [
                'If auto-renewal is still active, your saved card will be charged on or after the renewal date shown above. No manual payment is required for that cycle.',
                'To stop future automatic charges, sign in to your dashboard and use <strong>Cancel auto-renewal</strong> before the renewal date. Your listing stays active until the end of the current paid period.',
                'If you already cancelled auto-renewal, you will receive a manual renewal invoice by email when your plan is due—please pay before expiration to keep your resort publicly listed.',
                'Manage your subscription: <a href="'.$dash.'" style="color:#1d4ed8">'.$dash.'</a>',
                'Anti-ScamPH.com provides the platform subscription; resort operations, guest bookings, and on-site policies remain your responsibility as the resort owner.',
            ];
        } else {
            $intro = '<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 12px 0">'
                .'This is a friendly reminder from <strong>Anti-ScamPH.com</strong> about your <strong>resort subscription</strong>. '
                .'Your current billing period ends in <strong>'.$dayWord.'</strong>. '
                .'Please renew manually to keep your resort active on the platform.</p>'
                .'<p style="font-size:14px;line-height:1.55;color:#374151;margin:0 0 8px 0">Please keep this email for your records.</p>';

            $rows = self::detailRow('Resort name', $resortName)
                .self::detailRow('Plan', $plan)
                .self::detailRow('Current period ends', $periodEnd)
                .self::detailRow('Billing', 'Manual renewal')
                .self::detailRow('Renewal term', $renewalMonths.' month'.($renewalMonths > 1 ? 's' : ''))
                .self::detailRow('Amount due (next term, VAT-inclusive)', $renewalAmountLabel);

            $dash = htmlspecialchars($dashboardUrl, ENT_QUOTES, 'UTF-8');
            $bullets = [
                'Before your period ends, sign in and complete payment from <strong>Subscribe now</strong> in your dashboard, or pay the invoice we email when your plan is due.',
                'If payment is not received on time, your public listing may be suspended after the billing period ends.',
                'Room add-on slot payments are billed separately and are not included in automatic card renewal.',
                'Renew here: <a href="'.$dash.'" style="color:#1d4ed8">'.$dash.'</a>',
                'Anti-ScamPH.com provides the platform subscription; resort operations and guest policies remain under your management.',
            ];
        }

        return self::letterBlockHtml(
            $ownerName,
            $intro,
            $rows,
            'Subscription Details',
            $bullets,
        );
    }

    public static function bookingConfirmationBody(Reservation $r, string $guestName): string
    {
        $bookingDate = $r->created_at
            ? $r->created_at->timezone(config('app.timezone', 'UTC'))->format('F j, Y')
            : now()->format('F j, Y');
        $resortName = (string) ($r->resort?->name ?? 'Resort');
        $contact = trim((string) ($r->guest_phone ?? $r->client?->phone ?? '—'));
        if ($contact === '') {
            $contact = '—';
        }

        $intro = '<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 12px 0">'
            .'Thank you for booking through <strong>Anti-ScamPH.com</strong>. Your reservation has been successfully recorded.</p>'
            .'<p style="font-size:14px;line-height:1.55;color:#374151;margin:0 0 8px 0">Please keep this email as proof of your booking confirmation.</p>';

        $rows = self::detailRow('Guest name', trim((string) ($r->guest_name ?: $guestName)))
            .self::detailRow('Booking date', $bookingDate)
            .self::detailRow('Number of guests', (string) max(1, (int) $r->guest_count))
            .self::detailRow('Contact number', $contact)
            .self::detailRow('Resort name', $resortName)
            .self::detailRow('Check-in date', (string) $r->check_in_date)
            .self::detailRow('Check-out date', (string) $r->check_out_date)
            .self::detailRow('Reservation reference no.', (string) $r->reference_no);

        $bullets = [
            'The ₱500 reservation fee paid through Anti-ScamPH.com is the platform reservation fee. Any remaining resort balance, additional fees, deposits, or charges must be settled directly with the resort based on their own payment policy.',
            'All guests are required to follow the Clean As You Go policy. Guests must clean up after themselves before leaving the property. This does not include the replacement of bed sheets, linens, and other main resort items that are normally handled by the resort.',
            'Guests must treat the resort property as their own. Any damage, loss, or misuse of resort property will be charged based on the resort management’s declared price list.',
            'Illegal activities are strictly prohibited, including but not limited to illegal drugs, exploitation, human trafficking, violence, gambling where prohibited, and any act that violates Philippine law.',
            'Videoke, loud music, and sound systems are generally allowed only until 10:00 PM, unless the resort owner gives written or verbal permission for extended use.',
            'Guests are responsible for their personal safety and belongings during their stay.',
            'Guests must follow the resort’s house rules, check-in and check-out schedule, maximum guest capacity, pool rules, parking rules, pet policy, and other instructions given by the resort management.',
            'Only the declared number of guests in the booking is allowed. Additional guests may be subject to approval and extra charges by the resort.',
            'Guests must present a valid ID upon check-in if required by the resort. The name used in the booking must match the person responsible for the reservation.',
            'Cancellation, rebooking, refund, and no-show policies are subject to the resort’s own rules. Please coordinate directly with the resort for any changes.',
            'Anti-ScamPH.com helps verify and organize resort bookings, but the actual accommodation, facilities, services, safety management, and house rules remain under the responsibility of the resort owner or resort management.',
            'For questions or concerns, please contact the resort directly using the official contact details shown in your booking dashboard or confirmation page.',
        ];

        return self::letterBlock(
            $guestName,
            $intro,
            $rows,
            'Booking Details',
            $bullets,
        );
    }
}

