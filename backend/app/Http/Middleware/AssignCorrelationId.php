<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AssignCorrelationId
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('X-Correlation-Id');
        $id = is_string($header) && Str::isUuid($header)
            ? $header
            : Str::uuid()->toString();

        $request->headers->set('X-Correlation-Id', $id);

        Log::withContext(['correlation_id' => $id]);

        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Correlation-Id', $id);

        return $response;
    }
}
