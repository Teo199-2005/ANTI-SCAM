<?php

declare(strict_types=1);

namespace App\Modules\Resorts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Models\ResortReview;
use App\Services\ResortReviewService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ResortReviewController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly ResortReviewService $reviewService,
    ) {}

    /**
     * Submit a review for a resort (authenticated client only).
     */
    public function store(Request $request, Resort $resort)
    {
        $review = $this->reviewService->createReview($request->user(), $resort, $request->all());

        return $this->successResponse([
            'id' => $review->id,
            'resort_id' => $review->resort_id,
            'rating' => $review->rating,
            'comment' => $review->comment,
            'is_visible' => $review->is_visible,
            'created_at' => $review->created_at->toIso8601String(),
        ], 'Review submitted');
    }
}
