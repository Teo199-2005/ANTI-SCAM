<?php

namespace App\Services;

use App\Jobs\SendTransactionalEmailJob;
use App\Legal\PlatformTerms;
use App\Models\EmailLog;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
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

        $ack = $reservation->acknowledgment_receipt_no;
        $subjectSuffix = ($ack !== null && $ack !== '') ? $ack : $reservation->reference_no;

        $this->queueMail(
            'payment_receipt',
            $user->email,
            $user->name,
            'Digital Acknowledgment Receipt – '.$subjectSuffix,
            $fullHtml,
            [
                'reservation_id' => $reservation->id,
                'acknowledgment_receipt_no' => $ack,
            ],
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

    /** Subscription renewal confirmation (includes digital acknowledgment receipt when invoice is paid). */
    public function sendSubscriptionRenewalConfirmation(Subscription $subscription, ?SubscriptionInvoice $invoice = null): void
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
            $this->subscriptionRenewalHtml($subscription, $invoice),
            'Your subscription has been renewed successfully.'
        );

        $ack = $invoice?->acknowledgment_receipt_no;
        $subjectSuffix = ($ack !== null && $ack !== '') ? $ack : (string) ($subscription->resort?->name ?? 'Subscription');

        $this->queueMail(
            'subscription_renewal_confirmation',
            $owner->email,
            $owner->name,
            'Digital Acknowledgment Receipt – '.$subjectSuffix,
            $fullHtml,
            array_filter([
                'subscription_id' => $subscription->id,
                'subscription_invoice_id' => $invoice?->id,
                'acknowledgment_receipt_no' => $ack,
            ]),
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
        $fee = number_format((float) $r->reservation_fee, 2);
        $ref = htmlspecialchars((string) $r->reference_no, ENT_QUOTES, 'UTF-8');
        $ackRaw = (string) ($r->acknowledgment_receipt_no ?? '');
        $ack = htmlspecialchars($ackRaw, ENT_QUOTES, 'UTF-8');
        $ackRow = $ackRaw !== ''
            ? '<tr><td style="padding:8px 0;color:#6b7280">Digital acknowledgment receipt</td><td style="padding:8px 0;font-weight:600;font-family:monospace">'.$ack.'</td></tr>'
            : '';

        $tz = (string) config('app.timezone', 'UTC');
        $paidRow = '';
        if ($r->reserved_at) {
            $paidFmt = htmlspecialchars(
                $r->reserved_at->timezone($tz)->format('M j, Y g:i A T'),
                ENT_QUOTES,
                'UTF-8'
            );
            $paidRow = '<tr><td style="padding:8px 0;color:#6b7280">Paid on</td><td style="padding:8px 0;font-weight:600">'.$paidFmt.'</td></tr>';
        }

        $xid = (string) ($r->xendit_invoice_id ?? '');
        $xidRow = $xid !== ''
            ? '<tr><td style="padding:8px 0;color:#6b7280">Payment reference (Xendit)</td><td style="padding:8px 0;font-weight:600;font-family:monospace;font-size:12px">'
            .htmlspecialchars($xid, ENT_QUOTES, 'UTF-8').'</td></tr>'
            : '';

        $resortRow = '';
        if ($r->relationLoaded('resort') && $r->resort) {
            $rn = htmlspecialchars((string) $r->resort->name, ENT_QUOTES, 'UTF-8');
            $resortRow = '<tr><td style="padding:8px 0;color:#6b7280">Resort</td><td style="padding:8px 0;font-weight:600">'.$rn.'</td></tr>';
        }
        $roomRow = '';
        if ($r->relationLoaded('room') && $r->room) {
            $rm = htmlspecialchars((string) $r->room->name, ENT_QUOTES, 'UTF-8');
            $roomRow = '<tr><td style="padding:8px 0;color:#6b7280">Room</td><td style="padding:8px 0;font-weight:600">'.$rm.'</td></tr>';
        }

        $statusRow = '<tr><td style="padding:8px 0;color:#6b7280">Payment status</td><td style="padding:8px 0;font-weight:700;color:#059669">Paid</td></tr>';

        return <<<HTML
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:auto;padding:28px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff">
  <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Official receipt</p>
  <h2 style="margin:0 0 10px 0;color:#0f172a;font-size:22px;line-height:1.25">Reservation fee — paid</h2>
  <p style="font-size:14px;line-height:1.55;color:#334155;margin:0 0 18px 0">Thank you. This email confirms that your <strong>Anti-Scam PH</strong> platform reservation fee was received. This fee is <strong>non-refundable</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 8px 0;border-top:1px solid #e2e8f0">
    {$statusRow}
    {$paidRow}
    {$ackRow}
    {$xidRow}
    {$resortRow}
    {$roomRow}
    <tr><td style="padding:8px 0;color:#6b7280">Booking reference</td><td style="padding:8px 0;font-weight:600">{$ref}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280">Amount paid</td><td style="padding:8px 0;font-weight:700;color:#059669;font-size:18px">₱{$fee}</td></tr>
  </table>
  <p style="margin-top:18px;font-size:12px;line-height:1.5;color:#64748b;border-top:1px solid #f1f5f9;padding-top:14px">Keep this message for your records. The remaining balance for your stay is settled directly with the resort at check-in.</p>
</div>
HTML;
    }

    private function newBookingResortHtml(Reservation $r): string
    {
        $ref = htmlspecialchars((string) $r->reference_no, ENT_QUOTES, 'UTF-8');
        $ackRaw = (string) ($r->acknowledgment_receipt_no ?? '');
        $ack = htmlspecialchars($ackRaw, ENT_QUOTES, 'UTF-8');
        $ackLine = $ackRaw !== ''
            ? '<p style="margin-top:8px;font-size:13px">Platform fee acknowledgment: <strong style="font-family:monospace">'.$ack.'</strong></p>'
            : '';

        return <<<HTML
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="color:#1E3A5F">New Booking Received</h2>
  <p>Reservation <strong>{$ref}</strong> has been confirmed.</p>
  {$ackLine}
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

    private function subscriptionRenewalHtml(Subscription $s, ?SubscriptionInvoice $invoice = null): string
    {
        $amountVal = $invoice !== null ? (float) $invoice->amount : (float) $s->total_monthly_fee;
        $amount = number_format($amountVal, 2);
        $nextDue = htmlspecialchars((string) $s->next_due_date, ENT_QUOTES, 'UTF-8');
        $resortName = htmlspecialchars((string) ($s->resort?->name ?? ''), ENT_QUOTES, 'UTF-8');
        $ackRaw = (string) ($invoice?->acknowledgment_receipt_no ?? '');
        $ack = htmlspecialchars($ackRaw, ENT_QUOTES, 'UTF-8');
        $plan = htmlspecialchars((string) ($invoice?->plan ?? ''), ENT_QUOTES, 'UTF-8');
        $ackRow = $ackRaw !== ''
            ? '<tr><td style="padding:8px 0;color:#6b7280">Digital acknowledgment receipt</td><td style="padding:8px 0;font-weight:600;font-family:monospace">'.$ack.'</td></tr>'
            : '';
        $planRow = $plan !== ''
            ? '<tr><td style="padding:8px 0;color:#6b7280">Invoice plan</td><td style="padding:8px 0;font-weight:600">'.$plan.'</td></tr>'
            : '';

        $tz = (string) config('app.timezone', 'UTC');
        $paidRow = '';
        if ($invoice?->paid_at) {
            $paidFmt = htmlspecialchars(
                $invoice->paid_at->timezone($tz)->format('M j, Y g:i A T'),
                ENT_QUOTES,
                'UTF-8'
            );
            $paidRow = '<tr><td style="padding:8px 0;color:#6b7280">Paid on</td><td style="padding:8px 0;font-weight:600">'.$paidFmt.'</td></tr>';
        }

        $xid = (string) ($invoice?->xendit_invoice_id ?? '');
        $xidRow = $xid !== ''
            ? '<tr><td style="padding:8px 0;color:#6b7280">Payment reference (Xendit)</td><td style="padding:8px 0;font-weight:600;font-family:monospace;font-size:12px">'
            .htmlspecialchars($xid, ENT_QUOTES, 'UTF-8').'</td></tr>'
            : '';

        $statusRow = '<tr><td style="padding:8px 0;color:#6b7280">Payment status</td><td style="padding:8px 0;font-weight:700;color:#15803d">Paid</td></tr>';

        return <<<HTML
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:auto;padding:28px;border:1px solid #bbf7d0;border-radius:14px;background:linear-gradient(180deg,#f0fdf4 0%,#ffffff 48%)">
  <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#166534">Official acknowledgment</p>
  <h2 style="margin:0 0 10px 0;color:#14532d;font-size:22px;line-height:1.25">Subscription payment — received</h2>
  <p style="font-size:14px;line-height:1.55;color:#334155;margin:0 0 18px 0">This confirms that your subscription payment for <strong>{$resortName}</strong> was processed successfully through <strong>Anti-Scam PH</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 8px 0;border-top:1px solid #bbf7d0">
    {$statusRow}
    {$paidRow}
    {$ackRow}
    {$xidRow}
    {$planRow}
    <tr><td style="padding:8px 0;color:#6b7280">Amount paid</td><td style="padding:8px 0;font-weight:700;color:#15803d;font-size:18px">₱{$amount}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280">Next due date</td><td style="padding:8px 0;font-weight:600">{$nextDue}</td></tr>
  </table>
  <p style="margin-top:18px;font-size:12px;line-height:1.5;color:#64748b;border-top:1px solid #ecfdf5;padding-top:14px">Retain this email for your accounting records. For billing questions, reply to the support address in the footer.</p>
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
