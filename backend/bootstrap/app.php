<?php

use App\Http\Middleware\AssignCorrelationId;
use App\Http\Middleware\EnsureUserRole;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\TenantMiddleware;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // So Laravel uses X-Forwarded-For / X-Real-IP (from Nginx and from the Next.js BFF)
        // for Request::ip() — required for per-visitor auth rate limits when the BFF proxies to PHP.
        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO
                | Request::HEADER_X_FORWARDED_PREFIX
        );

        $middleware->alias([
            'role' => EnsureUserRole::class,
            'tenant' => TenantMiddleware::class,
        ]);

        $middleware->prependToGroup('api', AssignCorrelationId::class);
        $middleware->appendToGroup('api', TenantMiddleware::class);
        $middleware->append(SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Render all API exceptions as consistent JSON envelopes.
        $exceptions->render(function (Throwable $e, Request $request) {
            // Always return JSON for API traffic. Some reverse proxies expose PATH_INFO as `/v1/...`
            // (without the `/api` prefix); relying only on getPathInfo() can yield HTML error pages
            // for abort(403) while the SPA still sent Accept: application/json.
            $pathInfo = $request->getPathInfo();
            $path = $request->path();
            $isLikelyApiRequest =
                $request->expectsJson()
                || str_starts_with($pathInfo, '/api')
                || str_starts_with($pathInfo, '/v1/')
                || str_starts_with((string) $path, 'api/')
                || str_starts_with((string) $path, 'v1/');

            if (! $isLikelyApiRequest) {
                return null; // Let web routes render HTML as usual.
            }

            if ($e instanceof ValidationException) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'data' => null,
                    'errors' => $e->errors(),
                ], 422);
            }

            if ($e instanceof AuthenticationException) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                    'data' => null,
                    'errors' => null,
                ], 401);
            }

            if ($e instanceof AuthorizationException) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage() ?: 'Forbidden.',
                    'data' => null,
                    'errors' => null,
                ], 403);
            }

            if ($e instanceof ThrottleRequestsException) {
                $retryAfter = (int) ($e->getHeaders()['Retry-After'] ?? 60);

                return response()->json([
                    'success' => false,
                    'message' => $retryAfter > 0
                        ? "Please wait {$retryAfter} seconds before trying again."
                        : 'Please wait a moment before trying again.',
                    'data' => ['retry_after_seconds' => max(1, $retryAfter)],
                    'errors' => null,
                ], 429);
            }

            if ($e instanceof HttpException) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage() ?: 'HTTP error.',
                    'data' => null,
                    'errors' => null,
                ], $e->getStatusCode());
            }

            if ($e instanceof ModelNotFoundException) {
                return response()->json([
                    'success' => false,
                    'message' => 'Resource not found.',
                    'data' => null,
                    'errors' => null,
                ], 404);
            }

            // Generic 500 — never expose internals in production.
            $message = config('app.debug') ? $e->getMessage() : 'An unexpected error occurred.';

            return response()->json([
                'success' => false,
                'message' => $message,
                'data' => null,
                'errors' => null,
            ], 500);
        });
    })->create();
