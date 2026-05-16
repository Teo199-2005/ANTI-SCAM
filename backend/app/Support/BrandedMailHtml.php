<?php

namespace App\Support;

use Illuminate\Mail\Message;

class BrandedMailHtml
{
    public const LOGO_MARKER = 'data-brand-logo="1"';

    public static function logoFilePath(): ?string
    {
        foreach ([
            public_path('brand/mainlogo.png'),
            base_path('../frontend/public/mainlogo.png'),
            public_path('brand/mainlogo-bimi.png'),
            base_path('../frontend/public/mainlogo-bimi.png'),
        ] as $path) {
            if (is_readable($path)) {
                return $path;
            }
        }

        return null;
    }

    /** Public HTTPS URL for clients that load remote images; prefer the marketing site asset. */
    public static function resolveLogoUrl(): string
    {
        $configured = trim((string) config('services.mail_brand.logo_url', ''));
        if ($configured !== '') {
            return $configured;
        }

        $frontend = rtrim((string) config('app.frontend_url', ''), '/');
        if ($frontend !== '') {
            return "{$frontend}/mainlogo.png";
        }

        $appUrl = rtrim((string) config('app.url', ''), '/');
        if ($appUrl !== '' && is_readable(public_path('brand/mainlogo.png'))) {
            return "{$appUrl}/brand/mainlogo.png";
        }

        return '';
    }

    /**
     * Replace the branded logo <img> with an inline CID attachment so Gmail displays it
     * even when FRONTEND_URL is wrong or external image hosts are blocked.
     */
    public static function embedLogoInHtml(Message $message, string $html): string
    {
        $path = self::logoFilePath();
        if ($path === null) {
            return $html;
        }

        $cid = $message->embed($path, 'anti-scamph-logo');

        if (str_contains($html, self::LOGO_MARKER)
            && preg_match('/<img\b[^>]*data-brand-logo="1"[^>]*\bsrc="([^"]+)"/i', $html, $matches)) {
            return str_replace('src="'.$matches[1].'"', 'src="'.$cid.'"', $html);
        }

        $publicUrl = self::resolveLogoUrl();
        if ($publicUrl !== '') {
            return str_replace('src="'.$publicUrl.'"', 'src="'.$cid.'"', $html);
        }

        return $html;
    }

    public static function sendHtml(string $toEmail, ?string $toName, string $subject, string $html): void
    {
        \Illuminate\Support\Facades\Mail::send([], [], function (Message $message) use ($toEmail, $toName, $subject, $html): void {
            $message->to($toEmail, $toName ?? '')
                ->subject($subject)
                ->html(self::embedLogoInHtml($message, $html));
        });
    }
}
