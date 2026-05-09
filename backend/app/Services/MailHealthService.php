<?php

namespace App\Services;

use App\Models\EmailLog;
use Illuminate\Support\Facades\Mail;
use Throwable;

class MailHealthService
{
    public function __construct(private readonly BrandedEmailTemplateService $templateService)
    {
    }

    /**
     * Send a lightweight test email and persist result in email_logs.
     *
     * @return array{ok:bool,message:string,log_id:int}
     */
    public function sendTestEmail(string $toEmail, ?int $tenantId = null, string $source = 'manual'): array
    {
        $subject = 'Mail health check – Anti-Scam PH';
        $log = EmailLog::create([
            'tenant_id' => $tenantId,
            'type' => 'mail_health_check',
            'to_email' => $toEmail,
            'subject' => $subject,
            'status' => 'queued',
            'metadata' => ['source' => $source],
        ]);

        $timestamp = now()->toDateTimeString();

        try {
            Mail::send([], [], function ($m) use ($toEmail, $subject, $timestamp): void {
                $content = "<h2 style=\"margin:0 0 8px;color:#1e3a5f\">Brevo Mail Health Check</h2>"
                    . "<p style=\"margin:0 0 8px;color:#334155;line-height:1.65;\">Your SMTP integration is active and accepted this test message.</p>"
                    . "<p style=\"margin:0;color:#64748b;font-size:13px;\">Timestamp: {$timestamp}</p>";
                $m->to($toEmail)
                    ->subject($subject)
                    ->html($this->templateService->render('Mail health check', $content, 'SMTP mail test successful.'));
            });
            $log->update(['status' => 'sent', 'sent_at' => now()]);

            return [
                'ok' => true,
                'message' => 'Test email sent successfully.',
                'log_id' => $log->id,
            ];
        } catch (Throwable $e) {
            $log->update([
                'status' => 'failed',
                'error' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'message' => 'Failed to send test email: '.$e->getMessage(),
                'log_id' => $log->id,
            ];
        }
    }

}

