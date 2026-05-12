@echo off
setlocal
REM Same upload limits as `composer run serve` — use this if you run artisan directly on Windows.
set "PHP_INI_SCAN_DIR=%~dp0.php-ini.d"
php "%~dp0artisan" serve %*
