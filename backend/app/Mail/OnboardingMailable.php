<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;

class OnboardingMailable extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $resortName;

    /**
     * Create a new message instance.
     */
    public function __construct(string $resortName = '')
    {
        $this->resortName = $resortName;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('Anti-ScamPH — Hospitality Onboarding & Verification Process')
            ->view('emails.onboarding')
            ->with(['resortName' => $this->resortName]);
    }
}
