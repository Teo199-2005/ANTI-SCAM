<?php

namespace App\Services;

use App\Models\EmailLog;
use App\Models\EmailVerificationOtp;
use App\Models\User;
use App\Support\BrandedMailHtml;
use App\Support\OutboundMail;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class EmailVerificationOtpService
{
    private const OTP_LENGTH = 6;
    private const OTP_TTL_MINUTES = 10;
    private const MAX_ATTEMPTS = 5;
    private const RESEND_COOLDOWN_SECONDS = 60;

    public function __construct(private readonly BrandedEmailTemplateService $templateService)
    {
    }

    public function send(User $user): array
    {
        if (! OutboundMail::isConfiguredForDelivery()) {
            return [
                'ok' => false,
                'message' => 'Email could not be sent: outbound mail is not configured on the server (mail driver is log/array). Configure SMTP in the API environment and try again, or contact support.',
            ];
        }

        $lock = Cache::lock("email_otp_send_lock:{$user->id}", 10);
        if (! $lock->get()) {
            return [
                'ok' => true,
                'message' => 'Verification request is processing. Please wait a moment.',
                'expires_at' => null,
                'cooldown_seconds' => self::RESEND_COOLDOWN_SECONDS,
            ];
        }

        try {
            $activeOtp = EmailVerificationOtp::query()
                ->where('user_id', $user->id)
                ->whereNull('consumed_at')
                ->latest('id')
                ->first();

            if (
                $activeOtp
                && $activeOtp->created_at
                && CarbonImmutable::parse($activeOtp->created_at)->addSeconds(self::RESEND_COOLDOWN_SECONDS)->isFuture()
                && CarbonImmutable::now()->lessThanOrEqualTo($activeOtp->expires_at)
            ) {
                $cooldownRemaining = max(
                    1,
                    CarbonImmutable::parse($activeOtp->created_at)
                        ->addSeconds(self::RESEND_COOLDOWN_SECONDS)
                        ->diffInSeconds(CarbonImmutable::now())
                );

                return [
                    'ok' => true,
                    'message' => 'Verification code already sent. Please wait before requesting another code.',
                    'expires_at' => CarbonImmutable::parse($activeOtp->expires_at)->toIso8601String(),
                    'cooldown_seconds' => $cooldownRemaining,
                ];
            }

            $plainCode = $this->generateNumericCode(self::OTP_LENGTH);
            $expiresAt = CarbonImmutable::now()->addMinutes(self::OTP_TTL_MINUTES);

            EmailVerificationOtp::query()
                ->where('user_id', $user->id)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now()]);

            EmailVerificationOtp::query()->create([
                'user_id' => $user->id,
                'code_hash' => Hash::make($plainCode),
                'expires_at' => $expiresAt,
            ]);

            $log = EmailLog::query()->create([
                'tenant_id' => $user->tenant_id,
                'type' => 'email_verification_otp',
                'to_email' => $user->email,
                'subject' => 'Email verification OTP',
                'status' => 'queued',
                'metadata' => [
                    'expires_at' => $expiresAt->toIso8601String(),
                ],
            ]);

            try {
                $html = $this->templateService->render(
                    'Email verification code',
                    "<h2 style=\"margin:0 0 10px 0;font-size:22px;color:#0f172a;\">Verify your email address</h2>"
                        . "<p style=\"margin:0 0 12px 0;color:#334155;line-height:1.65;\">Hello {$user->name},</p>"
                        . "<p style=\"margin:0 0 14px 0;color:#334155;line-height:1.65;\">Use this one-time code to verify your account and continue in the dashboard:</p>"
                        . "<div style=\"display:inline-block;padding:12px 18px;border-radius:10px;border:1px solid #dbeafe;background:#eff6ff;font-size:28px;font-weight:700;letter-spacing:5px;color:#1e3a8a;\">{$plainCode}</div>"
                        . "<p style=\"margin:14px 0 0 0;color:#475569;line-height:1.65;\">This code expires at {$expiresAt->format('M d, Y h:i A')}.</p>"
                        . "<p style=\"margin:8px 0 0 0;color:#64748b;line-height:1.65;font-size:13px;\">If you did not request this, you can ignore this email.</p>",
                    'Your OTP code for account verification is ready.'
                );
                BrandedMailHtml::sendHtml($user->email, $user->name, 'Anti-Scam PH email verification code', $html);
                $log->update(['status' => 'sent', 'sent_at' => now()]);
            } catch (\Throwable $th) {
                $log->update([
                    'status' => 'failed',
                    'error' => mb_substr($th->getMessage(), 0, 1000),
                ]);
                return ['ok' => false, 'message' => 'Failed to send verification code.'];
            }

            return [
                'ok' => true,
                'message' => 'Verification code sent.',
                'expires_at' => $expiresAt->toIso8601String(),
                'cooldown_seconds' => self::RESEND_COOLDOWN_SECONDS,
            ];
        } finally {
            optional($lock)->release();
        }
    }

    public function verify(User $user, string $otp): array
    {
        $record = EmailVerificationOtp::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if (! $record) {
            return ['ok' => false, 'message' => 'No active verification code found.'];
        }

        if (CarbonImmutable::now()->greaterThan($record->expires_at)) {
            return ['ok' => false, 'message' => 'Verification code expired.'];
        }

        if ($record->attempts >= self::MAX_ATTEMPTS) {
            return ['ok' => false, 'message' => 'Too many invalid attempts. Request a new code.'];
        }

        $record->increment('attempts');
        if (! Hash::check($otp, $record->code_hash)) {
            return ['ok' => false, 'message' => 'Invalid verification code.'];
        }

        $record->forceFill(['consumed_at' => now()])->save();
        $user->forceFill(['email_verified_at' => now()])->save();

        return ['ok' => true, 'message' => 'Email verified successfully.'];
    }

    private function generateNumericCode(int $length): string
    {
        $code = '';
        for ($i = 0; $i < $length; $i++) {
            $code .= (string) random_int(0, 9);
        }

        return $code;
    }
}

