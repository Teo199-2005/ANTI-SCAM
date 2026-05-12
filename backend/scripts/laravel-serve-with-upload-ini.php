<?php

declare(strict_types=1);

/**
 * Starts `php artisan serve` with extra per-directory INI (upload/post limits).
 * Composer "serve" / "dev" use this so uploads work without remembering -d flags.
 *
 * Plain `php artisan serve` still uses host php.ini only — use `composer run serve`
 * or `serve.cmd` (Windows) from this folder.
 */

$root = dirname(__DIR__);
$scan = $root . DIRECTORY_SEPARATOR . '.php-ini.d';

if (! is_dir($scan)) {
    fwrite(STDERR, "Missing directory: {$scan}\n");
    exit(1);
}

putenv('PHP_INI_SCAN_DIR=' . $scan);

$extra = array_slice($argv, 1);
$artisan = $root . DIRECTORY_SEPARATOR . 'artisan';
$parts = [escapeshellarg(PHP_BINARY), escapeshellarg($artisan), 'serve'];
foreach ($extra as $arg) {
    $parts[] = escapeshellarg($arg);
}

passthru(implode(' ', $parts), $code);
exit($code ?? 1);
