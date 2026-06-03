<?php

declare(strict_types=1);

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ResortReview;
use App\Services\ResortReviewService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class AdminReviewController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly ResortReviewService $reviewService,
    ) {}

    /**
     * List all reviews with filters.
     */
    public function index(Request $request)
    {
        $search = trim((string) $request->string('search'));
        $filter = (string) $request->string('filter');
        $perPage = min(50, max(5, (int) $request->integer('perPage', 15)));

        $paginator = $this->reviewService->listAllReviews($search ?: null, $filter ?: null, $perPage);

        $items = collect($paginator->items())->map(function (ResortReview $review): array {
            return [
                'id' => $review->id,
                'resort_id' => $review->resort_id,
                'resort_name' => $review->resort?->name,
                'user_id' => $review->user_id,
                'user_name' => $review->user?->name,
                'user_email' => $review->user?->email,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'is_visible' => $review->is_visible,
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
     * Toggle review visibility.
     */
    public function toggleVisibility(ResortReview $review)
    {
        $updated = $this->reviewService->toggleVisibility($review);

        return $this->successResponse([
            'id' => $review->id,
            'is_visible' => $updated->is_visible,
        ], 'Review visibility updated');
    }
}
