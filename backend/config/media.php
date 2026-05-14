<?php

return [

    /*
    |--------------------------------------------------------------------------
    | User-uploaded media disk (local public vs Cloudflare R2)
    |--------------------------------------------------------------------------
    |
    | "public" — Laravel storage/app/public via symlink (/storage/... URLs).
    | "s3"     — S3-compatible API (set AWS_* + AWS_ENDPOINT for Cloudflare R2).
    |
    */
    'disk' => match (env('MEDIA_DISK', 'public')) {
        's3' => 's3',
        default => 'public',
    },

];
