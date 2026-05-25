<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Resort;
use App\Models\User;
use App\Support\BrandedMailHtml;
use App\Support\PlatformTransactionalEmailContent;
use Illuminate\Support\Facades\Log;

final class ResortVerificationNotificationService
{
    public function __construct(
        private readonly LandingReadinessService $landingReadiness,
        private readonly BrandedEmailTemplateService $templates,
    ) {}

    public function notifyOwnerDocumentsReceived(Resort $resort): void
    {
        $owner = $this->landingReadiness->resolveOwner($resort);
        if ($owner === null || ! filled($owner->email)) {
            return;
        }

        $this->send(
            $owner,
            'Anti-Scam PH — verification documents received',
            $this->wrap(
                $owner->name,
                '<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 16px 0">'
                .'We received your verification documents for <strong>'.e($resort->name).'</strong>. '
                .'Our team typically reviews submissions within <strong>24–72 hours</strong>. '
                .'Your listing stays hidden from public search until approved.</p>',
                PlatformTransactionalEmailContent::detailRow('Resort', $resort->name)
                .PlatformTransactionalEmailContent::detailRow('Submission #', (string) max(1, (int) $resort->verification_submission_count)),
            ),
        );
    }

    public function notifyOwnerApproved(Resort $resort): void
    {
        $owner = $this->landingReadiness->resolveOwner($resort);
        if ($owner === null || ! filled($owner->email)) {
            return;
        }

        $listed = $resort->is_publicly_listed ? 'Yes — guests can find you on the platform.' : 'Not yet — enable public listing in your resort profile when ready.';

        $this->send(
            $owner,
            'Anti-Scam PH — your resort is verified',
            $this->wrap(
                $owner->name,
                '<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 16px 0">'
                .'Congratulations! <strong>'.e($resort->name).'</strong> has passed Anti-Scam PH verification.</p>',
                PlatformTransactionalEmailContent::detailRow('Public listing', $listed),
            ),
        );
    }

    public function notifyOwnerRejected(Resort $resort, string $reason, bool $needsDocuments = false): void
    {
        $owner = $this->landingReadiness->resolveOwner($resort);
        if ($owner === null || ! filled($owner->email)) {
            return;
        }

        $intro = $needsDocuments
            ? 'We need additional documents or corrections before we can verify <strong>'.e($resort->name).'</strong>.'
            : 'Your verification submission for <strong>'.e($resort->name).'</strong> was not approved.';

        $this->send(
            $owner,
            $needsDocuments
                ? 'Anti-Scam PH — more documents needed for verification'
                : 'Anti-Scam PH — verification update',
            $this->wrap(
                $owner->name,
                '<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 16px 0">'.$intro.'</p>'
                .'<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 16px 0"><strong>Team note:</strong> '.e($reason).'</p>'
                .'<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 16px 0">Sign in to your dashboard and resubmit step 6 when ready.</p>',
                PlatformTransactionalEmailContent::detailRow('Resort', $resort->name),
            ),
        );
    }

    public function notifyAdminsNewSubmission(Resort $resort): void
    {
        $admins = User::withoutGlobalScopes()
            ->where('role', 'admin')
            ->whereNotNull('email')
            ->get();

        foreach ($admins as $admin) {
            $this->send(
                $admin,
                'Anti-Scam PH — new resort verification to review',
                $this->wrap(
                    $admin->name,
                    '<p style="font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 16px 0">'
                    .'A resort owner submitted verification documents.</p>',
                    PlatformTransactionalEmailContent::detailRow('Resort', $resort->name)
                    .PlatformTransactionalEmailContent::detailRow('Submission #', (string) max(1, (int) $resort->verification_submission_count)),
                ),
            );
        }
    }

    private function wrap(string $name, string $introHtml, string $rows): string
    {
        return PlatformTransactionalEmailContent::greeting($name)
            .$introHtml
            .'<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 0 0">'
            .$rows
            .'</table>'
            .PlatformTransactionalEmailContent::signature();
    }

    private function send(User $user, string $subject, string $bodyHtml): void
    {
        try {
            $html = $this->templates->render($subject, $bodyHtml);
            BrandedMailHtml::sendHtml((string) $user->email, $user->name, $subject, $html);
        } catch (\Throwable $e) {
            Log::warning('resort_verification_email_failed', [
                'user_id' => $user->id,
                'subject' => $subject,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
