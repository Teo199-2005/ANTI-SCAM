<?php

namespace App\Modules\Billing\Support;

final class XenditCheckoutUrl
{
    public static function isValid(string $url): bool
    {
        if ($url === '') {
            return false;
        }

        $host = parse_url($url, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return false;
        }

        $host = strtolower($host);

        return $host === 'xendit.co' || str_ends_with($host, '.xendit.co');
    }
}
