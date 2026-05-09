<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Support\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (str_starts_with($request->path(), 'api/v1/webhooks/')) {
            return $next($request);
        }

        $host = $request->getHost();
        $segments = explode('.', $host);
        $subdomain = $segments[0] ?? null;

        // Local and central domains should not resolve tenant context.
        if (! $subdomain || in_array($host, ['localhost', '127.0.0.1'], true) || $subdomain === 'www') {
            return $next($request);
        }

        // Apex hostnames (e.g. anti-scamph.com): only two labels — main site/API, not tenant.parent.com.
        if (count($segments) === 2) {
            return $next($request);
        }

        $tenant = Tenant::query()
            ->where('subdomain', $subdomain)
            ->where('status', 'active')
            ->first();

        if (! $tenant) {
            abort(404, 'Tenant not found for this subdomain.');
        }

        app()->instance('tenant', $tenant);
        TenantContext::setTenantId($tenant->id);

        $response = $next($request);

        // Clear tenant context after the request to prevent leakage in long-running processes.
        TenantContext::clear();

        return $response;
    }
}
