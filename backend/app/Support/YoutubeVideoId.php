<?php

namespace App\Support;

final class YoutubeVideoId
{
    /**
     * Extract an 11-character YouTube video id from a pasted URL or raw id string.
     */
    public static function parse(?string $urlOrId): ?string
    {
        if ($urlOrId === null) {
            return null;
        }

        $s = trim($urlOrId);
        if ($s === '') {
            return null;
        }

        if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $s)) {
            return $s;
        }

        if (preg_match('#youtu\.be/([a-zA-Z0-9_-]{11})#', $s, $m)) {
            return $m[1];
        }

        if (preg_match('#[?&]v=([a-zA-Z0-9_-]{11})#', $s, $m)) {
            return $m[1];
        }

        if (preg_match('#youtube\.com/embed/([a-zA-Z0-9_-]{11})#', $s, $m)) {
            return $m[1];
        }

        if (preg_match('#youtube\.com/shorts/([a-zA-Z0-9_-]{11})#', $s, $m)) {
            return $m[1];
        }

        return null;
    }
}
