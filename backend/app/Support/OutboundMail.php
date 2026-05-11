<?php

namespace App\Support;

/**
 * Detects mail drivers that never deliver to a real inbox (common misconfiguration on VPS).
 */
final class OutboundMail
{
    /**
     * True when the default mailer can send to external addresses (e.g. smtp, ses).
     */
    public static function isConfiguredForDelivery(): bool
    {
        $mailer = (string) config('mail.default', 'log');

        return ! in_array($mailer, ['log', 'array'], true);
    }
}
