<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Short, actionable copy when multipart uploads never become an UploadedFile.
 */
final class MultipartUploadHints
{
    public static function missingFileMessage(Request $request, string $humanLabel = 'file'): string
    {
        $len = (int) $request->header('Content-Length', 0);
        if ($len > 512 * 1024) {
            return 'The server did not receive your '.$humanLabel.' (common causes: file over PHP limits, or the request was cut off). '
                .'From the `backend` folder run `composer run serve` or `serve.cmd` — not plain `php artisan serve`. Use JPEG or PNG under the max size (not HEIC).';
        }

        return 'No '.$humanLabel.' was received. Choose JPEG, PNG, WebP, GIF, BMP, or TIFF under the size limit. '
            .'From the `backend` folder run `composer run serve` or `serve.cmd` for local uploads.';
    }
}
