<?php

namespace App\Http\Controllers;

use App\Legal\PlatformTerms;
use App\Shared\Traits\ApiResponseTrait;

class LegalController extends Controller
{
    use ApiResponseTrait;

    /** Public Terms & Conditions JSON (same copy as acceptance emails). */
    public function terms()
    {
        return $this->successResponse(PlatformTerms::publicPayload());
    }
}
