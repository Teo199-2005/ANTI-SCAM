<?php

namespace App\Jobs;

use App\Models\EmailLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendTransactionalEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    /**
     * @var list<int>
     */
    public array $backoff = [30, 120, 300, 600];

    public function __construct(public readonly int $emailLogId) {}

    public function handle(): void
    {
        $log = EmailLog::query()->find($this->emailLogId);
        if (! $log) {
            return;
        }

        if ($log->status === 'sent') {
            return;
        }

        if ($log->html_body === null || $log->html_body === '') {
            $log->update(['status' => 'failed', 'error' => 'Missing email body']);

            return;
        }

        $ctx = [
            'email_log_id' => $log->id,
            'email_type' => $log->type,
            'to_email' => $log->to_email,
            'correlation_id' => $log->correlation_id,
        ];

        Log::info('transactional_email_send_attempt', $ctx);

        try {
            Mail::html($log->html_body, function ($message) use ($log): void {
                $message->to($log->to_email, $log->to_name ?? '')
                    ->subject((string) ($log->subject ?? ''));
            });

            $log->update(['status' => 'sent', 'sent_at' => now(), 'error' => null]);

            Log::info('transactional_email_sent', $ctx);
        } catch (Throwable $e) {
            $log->update(['error' => $e->getMessage()]);
            Log::warning('transactional_email_send_failed', array_merge($ctx, [
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]));
            throw $e;
        }
    }

    public function failed(?Throwable $exception): void
    {
        EmailLog::query()->where('id', $this->emailLogId)->update([
            'status' => 'failed',
            'error' => $exception?->getMessage() ?? 'Exhausted retries',
        ]);

        Log::error('transactional_email_exhausted', [
            'email_log_id' => $this->emailLogId,
            'message' => $exception?->getMessage(),
        ]);
    }
}
