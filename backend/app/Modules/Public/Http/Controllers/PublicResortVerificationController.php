<?php

declare(strict_types=1);

namespace App\Modules\Public\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\ResortLinkVerificationService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

final class PublicResortVerificationController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly ResortLinkVerificationService $verificationService,
    ) {}

    /**
     * Public endpoint: verify a resort by pasting a link.
     * Checks Facebook, Instagram, TikTok, website, and Anti-Scam PH landing URLs.
     */
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'url' => ['required', 'string', 'max:500', 'url'],
        ]);

        $result = $this->verificationService->verify($validated['url']);

        return $this->successResponse($result, 'Resort link verification complete');
    }
}
