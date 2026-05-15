<?php

namespace App\Support;

/**
 * Normalize Xendit invoice callback payloads (legacy invoice.paid and invoice.status).
 */
final class XenditInvoiceWebhookStatus
{
    public static function normalizedStatus(array $payload): string
    {
        return strtoupper((string) ($payload['status'] ?? ''));
    }

    public static function isPaid(array $payload): bool
    {
        return in_array(self::normalizedStatus($payload), ['PAID', 'SETTLED'], true);
    }

    public static function isExpiredOrFailed(array $payload): bool
    {
        return in_array(self::normalizedStatus($payload), ['EXPIRED', 'FAILED'], true);
    }
}
