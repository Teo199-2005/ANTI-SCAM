<?php

namespace App\Console\Commands;

use App\Support\StoredMedia;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class VerifyMediaStorage extends Command
{
    protected $signature = 'media:verify';

    protected $description = 'Test configured media disk (public or R2) with a small write/delete';

    public function handle(): int
    {
        $disk = StoredMedia::disk();
        $this->info('MEDIA_DISK → '.$disk);

        if ($disk === 's3') {
            $this->line('AWS_BUCKET: '.config('filesystems.disks.s3.bucket'));
            $this->line('AWS_ENDPOINT: '.config('filesystems.disks.s3.endpoint'));
            $this->line('AWS_URL: '.config('filesystems.disks.s3.url'));
        }

        $key = 'health-check/'.Str::lower(Str::random(8)).'.txt';
        $payload = 'ok '.now()->toIso8601String();

        try {
            Storage::disk($disk)->put($key, $payload, ['visibility' => 'public']);
            $this->info("Wrote test object: {$key}");

            if (! Storage::disk($disk)->exists($key)) {
                $this->error('Write reported success but object not found.');

                return self::FAILURE;
            }

            Storage::disk($disk)->delete($key);
            $this->info('Deleted test object.');

            if ($disk === 's3') {
                $sampleUrl = Storage::disk('s3')->url($key);
                $this->line('Sample public URL pattern: '.dirname($sampleUrl).'/your-object-key');
            }

            $this->info('Media storage is working.');

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Media storage failed: '.$e->getMessage());
            if (StoredMedia::disk() === 's3') {
                $this->line('Check MEDIA_DISK=s3 (not MEDIA_DIS), R2 API token, bucket name, and AWS_ENDPOINT.');
            }

            return self::FAILURE;
        }
    }
}
