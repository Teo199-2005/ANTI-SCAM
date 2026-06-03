<?php

declare(strict_types=1);

namespace App\Modules\Public\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\SiteVisitorService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

final class SiteVisitorController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly SiteVisitorService $visitorService,
    ) {}

    /**
     * Record a visit from the public website.
     * This is a fire-and-forget endpoint — the frontend sends visit data on page load.
     */
    public function record(Request $request)
    {
        $validated = $request->validate([
            'session_id' => ['required', 'string', 'max:128', 'regex:/^[a-zA-Z0-9_.\-]+$/'],
            'page_url' => ['required', 'string', 'max:500', 'url'],
            'referrer_url' => ['nullable', 'string', 'max:500', 'url'],
            'resort_id' => ['nullable', 'integer', 'exists:resorts,id'],
        ]);

        $this->visitorService->recordVisit([
            'session_id' => $validated['session_id'],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'page_url' => $validated['page_url'],
            'referrer_url' => $validated['referrer_url'] ?? null,
            'resort_id' => $validated['resort_id'] ?? null,
        ]);

        return $this->successResponse(null, 'Visit recorded');
    }
}
