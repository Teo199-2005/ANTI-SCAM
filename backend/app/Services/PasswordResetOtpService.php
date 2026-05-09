<?php

namespace App\Services;

use App\Models\EmailLog;
use App\Models\PasswordResetOtp;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class PasswordResetOtpService
{
    private const OTP_LENGTH = 6;

    private const OTP_TTL_MINUTES = 15;

    private const MAX_ATTEMPTS = 5;

    private const RESEND_COOLDOWN_SECONDS = 60;

    public function __construct(private readonly BrandedEmailTemplateService $templateService)
    {
    }

    /**
     * @return array{ok: bool, message: string, expires_at: ?string, cooldown_seconds?: int}
     */
    public function sendForEmail(string $normalizedEmail): array
    {
        $user = User::query()
            ->whereRaw('lower(email) = ?', [mb_strtolower(trim($normalizedEmail))])
            ->first();

        if (! $user) {
            return [
                'ok' => true,
                'message' => 'If an account exists for this email, you will receive a reset code shortly.',
                'expires_at' => null,
            ];
        }

        $lock = Cache::lock('password_reset_otp_send:'.$user->id, 10);
        if (! $lock->get()) {
            return [
                'ok' => true,
                'message' => 'Reset request is processing. Please wait a moment.',
                'expires_at' => null,
                'cooldown_seconds' => self::RESEND_COOLDOWN_SECONDS,
            ];
        }

        try {
            $activeOtp = PasswordResetOtp::query()
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
                    'message' => 'A reset code was sent recently. Please wait before requesting another.',
                    'expires_at' => CarbonImmutable::parse($activeOtp->expires_at)->toIso8601String(),
                    'cooldown_seconds' => $cooldownRemaining,
                ];
            }

            $plainCode = $this->generateNumericCode(self::OTP_LENGTH);
            $expiresAt = CarbonImmutable::now()->addMinutes(self::OTP_TTL_MINUTES);

            PasswordResetOtp::query()
                ->where('user_id', $user->id)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now()]);

            PasswordResetOtp::query()->create([
                'user_id' => $user->id,
                'code_hash' => Hash::make($plainCode),
                'expires_at' => $expiresAt,
            ]);

            $log = EmailLog::query()->create([
                'tenant_id' => $user->tenant_id,
                'type' => 'password_reset_otp',
                'to_email' => $user->email,
                'subject' => 'Password reset OTP',
                'status' => 'queued',
                'metadata' => [
                    'expires_at' => $expiresAt->toIso8601String(),
                ],
            ]);

            try {
                Mail::send([], [], function ($message) use ($user, $plainCode, $expiresAt): void {
                    $content = "<h2 style=\"margin:0 0 10px 0;font-size:22px;color:#0f172a;\">Reset your password</h2>"
                        . "<p style=\"margin:0 0 12px 0;color:#334155;line-height:1.65;\">Hello {$user->name},</p>"
                        . "<p style=\"margin:0 0 14px 0;color:#334155;line-height:1.65;\">Use this one-time code to set a new password for your Anti-Scam PH account:</p>"
                        . "<div style=\"display:inline-block;padding:12px 18px;border-radius:10px;border:1px solid #dbeafe;background:#eff6ff;font-size:28px;font-weight:700;letter-spacing:5px;color:#1e3a8a;\">{$plainCode}</div>"
                        . "<p style=\"margin:14px 0 0 0;color:#475569;line-height:1.65;\">This code expires at {$expiresAt->format('M d, Y h:i A')}.</p>"
                        . "<p style=\"margin:8px 0 0 0;color:#64748b;line-height:1.65;font-size:13px;\">If you did not request a password reset, you can ignore this email.</p>";

                    $message->to($user->email, $user->name)
                        ->subject('Anti-Scam PH password reset code')
                        ->html($this->templateService->render(
                            'Password reset code',
                            $content,
                            'Your one-time code to reset your password is ready.'
                        ));
                });
                $log->update(['status' => 'sent', 'sent_at' => now()]);
            } catch (\Throwable $th) {
                $log->update([
                    'status' => 'failed',
                    'error' => mb_substr($th->getMessage(), 0, 1000),
                ]);

                return ['ok' => false, 'message' => 'Failed to send reset code. Try again later.', 'expires_at' => null];
            }

            return [
                'ok' => true,
                'message' => 'If an account exists for this email, you will receive a reset code shortly.',
                'expires_at' => $expiresAt->toIso8601String(),
                'cooldown_seconds' => self::RESEND_COOLDOWN_SECONDS,
            ];
        } finally {
            optional($lock)->release();
        }
    }

    /**
     * @return array{ok: bool, message: string}
     */
    public function verifyAndResetPassword(string $normalizedEmail, string $otp, string $newPassword): array
    {
        $user = User::query()
            ->whereRaw('lower(email) = ?', [mb_strtolower(trim($normalizedEmail))])
            ->first();

        if (! $user) {
            return ['ok' => false, 'message' => 'Invalid or expired reset code.'];
        }

        $record = PasswordResetOtp::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if (! $record) {
            return ['ok' => false, 'message' => 'Invalid or expired reset code.'];
        }

        if (CarbonImmutable::now()->greaterThan($record->expires_at)) {
            return ['ok' => false, 'message' => 'Invalid or expired reset code.'];
        }

        if ($record->attempts >= self::MAX_ATTEMPTS) {
            return ['ok' => false, 'message' => 'Too many attempts. Request a new reset code.'];
        }

        $record->increment('attempts');
        if (! Hash::check($otp, $record->code_hash)) {
            return ['ok' => false, 'message' => 'Invalid or expired reset code.'];
        }

        $record->forceFill(['consumed_at' => now()])->save();

        $user->forceFill(['password' => $newPassword])->save();
        $user->tokens()->delete();

        return ['ok' => true, 'message' => 'Password updated. You can sign in with your new password.'];
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
