<?php

namespace App\Modules\Billing\Support;

class XenditTls
{
    /**
     * Guzzle options for Laravel Http client when calling Xendit.
     * On Windows dev, cURL often lacks a CA bundle → error 60. Set
     * XENDIT_HTTP_VERIFY to a path to cacert.pem, or false locally only.
     */
    public static function httpClientOptions(): array
    {
        return ['verify' => self::verifySetting()];
    }

    /**
     * @return bool|string
     */
    public static function verifySetting()
    {
        $v = config('services.xendit.http_verify', true);

        if ($v === false || $v === 'false' || $v === '0') {
            return app()->isProduction() ? true : false;
        }

        if (is_string($v) && $v !== '' && ! in_array(strtolower($v), ['true', '1'], true)) {
            if (is_file($v)) {
                return $v;
            }
        }

        return true;
    }
}
