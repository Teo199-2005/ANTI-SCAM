<?php

declare(strict_types=1);

namespace App\Modules\Public\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Services\ResortReviewService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class PublicResortReviewController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly ResortReviewService $reviewService,
    ) {}

    /**
     * Get visible reviews for a resort (public, no auth required).
     */
    public function index(Resort $resort)
    {
        $perPage = min(50, max(5, (int) request()->integer('perPage', 10)));

        $paginator = $this->reviewService->getResortReviews($resort, $perPage);

        $items = collect($paginator->items())->map(function ($review): array {
            return [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'user_name' => $review->user?->name ?? 'Guest',
                'created_at' => $review->created_at->toIso8601String(),
            ];
        });

        return $this->successResponse([
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ], 'Reviews fetched');
    }

    /**
     * Get rating summary for a resort (public).
     */
    public function summary(Resort $resort)
    {
        return $this->successResponse(
            $this->reviewService->getResortRatingSummary($resort),
            'Rating summary fetched',
        );
    }
}
