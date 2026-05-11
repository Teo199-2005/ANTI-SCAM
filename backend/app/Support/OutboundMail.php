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
        // Only enforce this guard in production. Local dev and test environments frequently
        // use the "log" or "array" drivers on purpose (and our PHPUnit suite expects those).
        if (! app()->environment('production')) {
            return true;
        }

        $mailer = (string) config('mail.default', 'log');

        return ! in_array($mailer, ['log', 'array'], true);
    }
}
