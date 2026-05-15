<?php

/**
 * Legacy-friendly URL for Xendit EXPIRED / FAILED invoice webhooks (Philippines).
 * Forwards to Laravel route POST /api/v1/webhooks/xendit/expired-ph.
 *
 * Configure in Xendit Dashboard:
 *   https://your-domain.com/expired_xendit_ph.php
 */

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/../vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Kernel::class);

$rawBody = file_get_contents('php://input') ?: '';

$server = $_SERVER;
$server['REQUEST_METHOD'] = 'POST';
$server['REQUEST_URI'] = '/api/v1/webhooks/xendit/expired-ph';
$server['PATH_INFO'] = '/api/v1/webhooks/xendit/expired-ph';

$request = Request::create(
    '/api/v1/webhooks/xendit/expired-ph',
    'POST',
    [],
    $_COOKIE,
    $_FILES,
    $server,
    $rawBody
);

$request->headers->set('Content-Type', $_SERVER['HTTP_CONTENT_TYPE'] ?? $_SERVER['CONTENT_TYPE'] ?? 'application/json');
if (isset($_SERVER['HTTP_X_CALLBACK_TOKEN'])) {
    $request->headers->set('x-callback-token', $_SERVER['HTTP_X_CALLBACK_TOKEN']);
}

$response = $kernel->handle($request);
$response->send();
$kernel->terminate($request, $response);
