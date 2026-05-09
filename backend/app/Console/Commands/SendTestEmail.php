<?php

namespace App\Console\Commands;

use App\Services\MailHealthService;
use Illuminate\Console\Command;

class SendTestEmail extends Command
{
    protected $signature = 'mail:test {to : Recipient email address}';
    protected $description = 'Send a Brevo/SMTP test email and log result.';

    public function handle(MailHealthService $mailHealth): int
    {
        $to = (string) $this->argument('to');

        if (! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email address.');
            return self::FAILURE;
        }

        $result = $mailHealth->sendTestEmail($to, null, 'artisan');

        if ($result['ok']) {
            $this->info($result['message'].' email_log_id='.$result['log_id']);
            return self::SUCCESS;
        }

        $this->error($result['message'].' email_log_id='.$result['log_id']);
        return self::FAILURE;
    }
}

