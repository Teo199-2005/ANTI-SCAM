<?php

namespace App\Services;

use App\Legal\PlatformTerms;
use App\Models\EmailLog;
use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Throwable;

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

        $this->dispatch(
            'terms_accepted',
            $user->email,
            'Anti-Scam PH — Terms & Conditions confirmation',
            function () use ($user, $bodyHtml): void {
                Mail::send([], [], function ($m) use ($user, $bodyHtml): void {
                    $m->to($user->email, $user->name)
                        ->subject('Anti-Scam PH — Terms & Conditions confirmation')
                        ->html($this->templateService->render(
                            'Terms & Conditions',
                            $bodyHtml,
                            'Your copy of the agreement is attached in this email.'
                        ));
                });
            },
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

        $this->dispatch(
            'booking_confirmation',
            $user->email,
            'Booking Confirmed – '.$reservation->reference_no,
            function () use ($reservation, $user): void {
                Mail::send([], [], function ($m) use ($reservation, $user): void {
                    $m->to($user->email, $user->name)
                        ->subject('Booking Confirmed – '.$reservation->reference_no)
                        ->html($this->templateService->render(
                            'Booking confirmed',
                            $this->bookingConfirmationHtml($reservation),
                            'Your booking has been confirmed.'
                        ));
                });
            },
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

        $this->dispatch(
            'payment_receipt',
            $user->email,
            'Payment Receipt – '.$reservation->reference_no,
            function () use ($reservation, $user): void {
                Mail::send([], [], function ($m) use ($reservation, $user): void {
                    $m->to($user->email, $user->name)
                        ->subject('Payment Receipt – '.$reservation->reference_no)
                        ->html($this->templateService->render(
                            'Payment receipt',
                            $this->paymentReceiptHtml($reservation),
                            'Your reservation fee receipt is here.'
                        ));
                });
            },
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
        } // use contact email if available

        // Resort notification uses a platform admin email or resort owner email
        $resortOwner = User::withoutGlobalScopes()
            ->where('tenant_id', $resort->tenant_id)
            ->where('role', 'resort_owner')
            ->first();

        if (! $resortOwner?->email) {
            return;
        }

        $this->dispatch(
            'new_booking_resort',
            $resortOwner->email,
            'New Booking Received – '.$reservation->reference_no,
            function () use ($reservation, $resortOwner): void {
                Mail::send([], [], function ($m) use ($reservation, $resortOwner): void {
                    $m->to($resortOwner->email, $resortOwner->name)
                        ->subject('New Booking – '.$reservation->reference_no)
                        ->html($this->templateService->render(
                            'New booking received',
                            $this->newBookingResortHtml($reservation),
                            'A new booking is confirmed for your resort.'
                        ));
                });
            },
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

        $this->dispatch(
            'subscription_due',
            $owner->email,
            'Subscription Payment Due – '.$subscription->resort?->name,
            function () use ($subscription, $owner): void {
                Mail::send([], [], function ($m) use ($subscription, $owner): void {
                    $m->to($owner->email, $owner->name)
                        ->subject('Subscription Payment Due')
                        ->html($this->templateService->render(
                            'Subscription payment due',
                            $this->subscriptionDueHtml($subscription),
                            'Your subscription payment due reminder.'
                        ));
                });
            },
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

        $this->dispatch(
            'subscription_renewal_confirmation',
            $owner->email,
            'Subscription Renewed – '.$subscription->resort?->name,
            function () use ($subscription, $owner): void {
                Mail::send([], [], function ($m) use ($subscription, $owner): void {
                    $m->to($owner->email, $owner->name)
                        ->subject('Subscription Renewed')
                        ->html($this->templateService->render(
                            'Subscription renewed',
                            $this->subscriptionRenewalHtml($subscription),
                            'Your subscription has been renewed successfully.'
                        ));
                });
            },
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

        $this->dispatch(
            'grace_period_alert',
            $owner->email,
            'Action Required: Subscription Grace Period – '.$subscription->resort?->name,
            function () use ($subscription, $owner): void {
                Mail::send([], [], function ($m) use ($subscription, $owner): void {
                    $m->to($owner->email)
                        ->subject('Subscription Grace Period Alert')
                        ->html($this->templateService->render(
                            'Grace period alert',
                            $this->gracePeriodHtml($subscription),
                            'Action required to avoid suspension.'
                        ));
                });
            },
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

        $this->dispatch(
            'resort_suspended',
            $owner->email,
            'Your resort listing has been suspended – '.$resort->name,
            function () use ($resort, $owner): void {
                Mail::send([], [], function ($m) use ($resort, $owner): void {
                    $m->to($owner->email)
                        ->subject('Resort Listing Suspended')
                        ->html($this->templateService->render(
                            'Resort listing suspended',
                            $this->suspensionHtml($resort),
                            'Your resort listing has been suspended.'
                        ));
                });
            },
            ['resort_id' => $resort->id],
            $resort->tenant_id
        );
    }

    // ──────────────────────────────────────────────────────────────────
    // Dispatcher: wraps send in try/catch and writes EmailLog
    // ──────────────────────────────────────────────────────────────────

    private function dispatch(
        string $type,
        string $toEmail,
        string $subject,
        callable $sender,
        array $metadata = [],
        ?int $tenantId = null
    ): void {
        $log = EmailLog::create([
            'tenant_id' => $tenantId,
            'type' => $type,
            'to_email' => $toEmail,
            'subject' => $subject,
            'status' => 'queued',
            'metadata' => $metadata,
        ]);

        try {
            $sender();
            $log->update(['status' => 'sent', 'sent_at' => now()]);
        } catch (Throwable $e) {
            $log->update(['status' => 'failed', 'error' => $e->getMessage()]);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // Email HTML templates (inline – swap for proper Blade views later)
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
