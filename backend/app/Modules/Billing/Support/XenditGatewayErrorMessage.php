<?php

namespace App\Modules\Billing\Support;

final class XenditGatewayErrorMessage
{
    public static function fromResponse(int $status, mixed $errorBody, string $contextLabel = 'Payment'): string
    {
        $message = is_array($errorBody) ? (string) ($errorBody['message'] ?? '') : '';
        $code = is_array($errorBody) ? (string) ($errorBody['error_code'] ?? '') : '';

        if ($code === 'UNAUTHORIZED_SENDER_IP' || stripos($message, 'IP Allowlist') !== false) {
            return 'Xendit blocked this request: your server IP is not on the API key IP allowlist. '
                .'In Xendit Dashboard → Settings → Developers → IP allowlist, add your current public IP '
                .'(or disable the allowlist for testing). For local dev, use an `xnd_development_` key instead of production.';
        }

        if ($status === 403 || $code === 'REQUEST_FORBIDDEN_ERROR') {
            if ($message !== '') {
                return "Xendit: {$message}";
            }

            return 'Xendit API key cannot create invoices. In Dashboard → API Keys, enable Money-in / Invoices (write) for this key.';
        }

        if ($status === 401) {
            return 'Xendit API key is invalid or unauthorized. Verify XENDIT_SECRET_KEY in backend/.env.';
        }

        return $message !== ''
            ? "{$contextLabel} gateway error: {$message}"
            : "{$contextLabel} gateway error. Please try again.";
    }

    public static function isRecoverableForbidden(int $status, mixed $errorBody): bool
    {
        if ($status === 401) {
            return false;
        }

        $code = is_array($errorBody) ? (string) ($errorBody['error_code'] ?? '') : '';

        return $status === 403
            || $code === 'REQUEST_FORBIDDEN_ERROR'
            || $code === 'UNAUTHORIZED_SENDER_IP';
    }
}
