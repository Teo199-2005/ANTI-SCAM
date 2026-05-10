<?php

namespace App\Services;

use App\Jobs\SendTransactionalEmailJob;
use App\Legal\PlatformTerms;
use App\Models\EmailLog;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;

class EmailNotificationService
{
    public function __construct(private readonly BrandedEmailTemplateService $templateService) {}

    /** Send full Terms & Conditions to the user after explicit acceptance (registration or onboarding). */
    public function sendTermsAccepted(User $user, string $contextLabel): void
    {
        if (! $user->email) {
            return;
        }

        $summary = PlatformTerms::emailSummaryLine($contextLabel);
        $bodyHtml = '<p style="font-size:14px;line-height:1.55;color:#374151">'
            .htmlspecialchars($summary, ENT_QUOTES, 'UTF-8')
            .'</p>'
            .PlatformTerms::toEmailHtml();

        $fullHtml = $this->templateService->render(
            'Terms & Conditions',
            $bodyHtml,
            'Your copy of the agreement is attached in this email.'
        );

        $this->queueMail(
            'terms_accepted',
            $user->email,
            $user->name,
            'Anti-Scam PH — Terms & Conditions confirmation',
            $fullHtml,
            ['user_id' => $user->id, 'terms_version' => PlatformTerms::version()],
            $user->tenant_id
        );
    }

    /** Send a booking confirmation email to the guest. */
    public function sendBookingConfirmation(Reservation $reservation): void
    {
        $user = $reservation->client;
        if (! $user?->email) {
            return;
        }

        $fullHtml = $this->templateService->render(
            'Booking confirmed',
            $this->bookingConfirmationHtml($reservation),
            'Your booking has been confirmed.'
        );

        $this->queueMail(
            'booking_confirmation',
            $user->email,
            $user->name,
            'Booking Confirmed – '.$reservation->reference_no,
            $fullHtml,
            ['reservation_id' => $reservation->id],
            $reservation->tenant_id
        );
    }

    /** Send a payment receipt email. */
    public function sendPaymentReceipt(Reservation $reservation): void
    {
        $user = $reservation->client;
        if (! $user?->email) {
            return;
        }

        $fullHtml = $this->templateService->render(
            'Payment receipt',
            $this->paymentReceiptHtml($reservation),
            'Your reservation fee receipt is here.'
        );

        $this->queueMail(
            'payment_receipt',
            $user->email,
            $user->name,
            'Payment Receipt – '.$reservation->reference_no,
            $fullHtml,
            ['reservation_id' => $reservation->id],
            $reservation->tenant_id
        );
    }

    /** Notify resort of a new booking. */
    public function sendNewBookingToResort(Reservation $reservation): void
    {
        $resort = $reservation->resort;
        if (! $resort?->contact_number) {
            return;
        }

        $resortOwner = User::withoutGlobalScopes()
            ->where('tenant_id', $resort->tenant_id)
            ->where('role', 'resort_owner')
            ->first();

        if (! $resortOwner?->email) {
            return;
        }

        $fullHtml = $this->templateService->render(
            'New booking received',
            $this->newBookingResortHtml($reservation),
            'A new booking is confirmed for your resort.'
        );

        $this->queueMail(
            'new_booking_resort',
            $resortOwner->email,
            $resortOwner->name,
            'New Booking Received – '.$reservation->reference_no,
            $fullHtml,
            ['reservation_id' => $reservation->id],
            $reservation->tenant_id
        );
    }

    /** Subscription due reminder. */
    public function sendSubscriptionDue(Subscription $subscription): void
    {
        $owner = User::withoutGlobalScopes()
            ->where('tenant_id', $subscription->tenant_id)
            ->where('role', 'resort_owner')
            ->first();

        if (! $owner?->email) {
            return;
        }

        $fullHtml = $this->templateService->render(
            'Subscription payment due',
            $this->subscriptionDueHtml($subscription),
            'Your subscription payment due reminder.'
        );

        $this->queueMail(
            'subscription_due',
            $owner->email,
            $owner->name,
            'Subscription Payment Due – '.$subscription->resort?->name,
            $fullHtml,
            ['subscription_id' => $subscription->id],
            $subscription->tenant_id
        );
    }

    /** Subscription renewal confirmation. */
    public function sendSubscriptionRenewalConfirmation(Subscription $subscription): void
    {
        $owner = User::withoutGlobalScopes()
            ->where('tenant_id', $subscription->tenant_id)
            ->where('role', 'resort_owner')
            ->first();

        if (! $owner?->email) {
            return;
        }

        $fullHtml = $this->templateService->render(
            'Subscription renewed',
            $this->subscriptionRenewalHtml($subscription),
            'Your subscription has been renewed successfully.'
        );

        $this->queueMail(
            'subscription_renewal_confirmation',
            $owner->email,
            $owner->name,
            'Subscription Renewed – '.$subscription->resort?->name,
            $fullHtml,
            ['subscription_id' => $subscription->id],
            $subscription->tenant_id
        );
    }

    /** Grace period alert. */
    public function sendGracePeriodAlert(Subscription $subscription): void
    {
        $owner = User::withoutGlobalScopes()
            ->where('tenant_id', $subscription->tenant_id)
            ->where('role', 'resort_owner')
            ->first();

        if (! $owner?->email) {
            return;
        }

        $fullHtml = $this->templateService->render(
            'Grace period alert',
            $this->gracePeriodHtml($subscription),
            'Action required to avoid suspension.'
        );

        $this->queueMail(
            'grace_period_alert',
            $owner->email,
            $owner->name,
            'Action Required: Subscription Grace Period – '.$subscription->resort?->name,
            $fullHtml,
            ['subscription_id' => $subscription->id],
            $subscription->tenant_id
        );
    }

    /** Suspension notice. */
    public function sendSuspensionNotice(Resort $resort): void
    {
        $owner = User::withoutGlobalScopes()
            ->where('tenant_id', $resort->tenant_id)
            ->where('role', 'resort_owner')
            ->first();

        if (! $owner?->email) {
            return;
        }

        $fullHtml = $this->templateService->render(
            'Resort listing suspended',
            $this->suspensionHtml($resort),
            'Your resort listing has been suspended.'
        );

        $this->queueMail(
            'resort_suspended',
            $owner->email,
            $owner->name,
            'Your resort listing has been suspended – '.$resort->name,
            $fullHtml,
            ['resort_id' => $resort->id],
            $resort->tenant_id
        );
    }

    private function queueMail(
        string $type,
        string $toEmail,
        ?string $toName,
        string $subject,
        string $fullHtml,
        array $metadata = [],
        ?int $tenantId = null,
    ): void {
        $correlationHeader = Request::header('X-Correlation-Id');
        $correlationId = is_string($correlationHeader) && Str::isUuid($correlationHeader)
            ? $correlationHeader
            : Str::uuid()->toString();

        $meta = array_merge($metadata, ['correlation_id' => $correlationId]);

        $log = EmailLog::create([
            'tenant_id' => $tenantId,
            'type' => $type,
            'to_email' => $toEmail,
            'to_name' => $toName,
            'subject' => $subject,
            'status' => 'queued',
            'metadata' => $meta,
            'html_body' => $fullHtml,
            'correlation_id' => $correlationId,
        ]);

        if (! config('mail.queue_transactional', true)) {
            Bus::dispatchSync(new SendTransactionalEmailJob($log->id));

            return;
        }

        // When the queue connection is `sync`, run immediately so HTTP tests and local dev
        // see final `email_logs` state. For Redis/database workers, defer until after commit
        // so workers never read a row that rolled back with the HTTP transaction.
        if (config('queue.default') === 'sync') {
            Bus::dispatchSync(new SendTransactionalEmailJob($log->id));

            return;
        }

        SendTransactionalEmailJob::dispatch($log->id)->afterCommit();
    }

    // ──────────────────────────────────────────────────────────────────
    // Email HTML fragments (inline – can migrate to Blade partials later)
    // ──────────────────────────────────────────────────────────────────

    private function bookingConfirmationHtml(Reservation $r): string
    {
        $fee = number_format($r->reservation_fee, 2);
        $total = number_format($r->total_amount, 2);
        $balance = number_format($r->total_amount - $r->reservation_fee, 2);

        return <<<HTML
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="color:#1E3A5F">Booking Confirmed!</h2>
  <p>Your reservation <strong>{$r->reference_no}</strong> is confirmed.</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">
    <tr><td style="padding:8px 0;color:#6b7280">Check-in</td><td style="padding:8px 0;font-weight:600">{$r->check_in_date}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280">Check-out</td><td style="padding:8px 0;font-weight:600">{$r->check_out_date}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280">Reservation fee paid</td><td style="padding:8px 0;font-weight:600;color:#10b981">₱{$fee}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280">Balance due at resort</td><td style="padding:8px 0;font-weight:600;color:#f97316">₱{$balance}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280">Total booking amount</td><td style="padding:8px 0;font-weight:600">₱{$total}</td></tr>
  </table>
  <p style="margin-top:16px;font-size:12px;color:#9ca3af">The reservation fee is non-refundable. The remaining balance is paid directly at the resort upon check-in.</p>
</div>
HTML;
    }

    private function paymentReceiptHtml(Reservation $r): string
    {
        $fee = number_format($r->reservation_fee, 2);

        return <<<HTML
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="color:#1E3A5F">Payment Receipt</h2>
  <p>Reference: <strong>{$r->reference_no}</strong></p>
  <p>Amount paid: <strong style="color:#10b981">₱{$fee}</strong> (non-refundable reservation fee)</p>
  <p style="font-size:12px;color:#9ca3af">This is your official receipt for the platform reservation fee. Keep this for your records.</p>
</div>
HTML;
    }

    private function newBookingResortHtml(Reservation $r): string
    {
        return <<<HTML
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="color:#1E3A5F">New Booking Received</h2>
  <p>Reservation <strong>{$r->reference_no}</strong> has been confirmed.</p>
  <p>Check-in: <strong>{$r->check_in_date}</strong> → Check-out: <strong>{$r->check_out_date}</strong></p>
  <p>Guests: {$r->guest_count}</p>
  <p style="font-size:12px;color:#9ca3af">Log in to your resort dashboard for full details.</p>
</div>
HTML;
    }

    private function subscriptionDueHtml(Subscription $s): string
    {
        $due = $s->next_due_date;
        $amount = number_format($s->total_monthly_fee, 2);

        return <<<HTML
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #fde68a;border-radius:12px;background:#fffbeb">
  <h2 style="color:#92400e">Subscription Payment Due</h2>
  <p>Your subscription of <strong>₱{$amount}/month</strong> is due on <strong>{$due}</strong>.</p>
  <p>Please settle your payment to avoid a grace period and eventual suspension of your public listing.</p>
</div>
HTML;
    }

    private function subscriptionRenewalHtml(Subscription $s): string
    {
        $amount = number_format($s->total_monthly_fee, 2);
        $nextDue = $s->next_due_date;

        return <<<HTML
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #bbf7d0;border-radius:12px;background:#f0fdf4">
  <h2 style="color:#166534">Subscription Renewed</h2>
  <p>Your subscription payment of <strong>₱{$amount}</strong> has been received successfully.</p>
  <p>Next due date: <strong>{$nextDue}</strong></p>
</div>
HTML;
    }

    private function gracePeriodHtml(Subscription $s): string
    {
        $grace = $s->grace_until;

        return <<<HTML
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #fca5a5;border-radius:12px;background:#fff1f2">
  <h2 style="color:#991b1b">⚠️ Subscription Grace Period Active</h2>
  <p>Your subscription payment is overdue. You have until <strong>{$grace}</strong> to settle before your resort listing is suspended.</p>
</div>
HTML;
    }

    private function suspensionHtml(Resort $resort): string
    {
        return <<<HTML
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #fca5a5;border-radius:12px;background:#fff1f2">
  <h2 style="color:#991b1b">Resort Listing Suspended</h2>
  <p>Your resort <strong>{$resort->name}</strong> has been removed from public listing due to an unpaid subscription.</p>
  <p>To reactivate, please contact support and settle your subscription balance.</p>
</div>
HTML;
    }
}
