<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Resort;
use App\Models\ResortReview;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

final class ResortReviewService
{
    /**
     * Create a review for a resort. Validates that:
     * - The user has a completed reservation at this resort
     * - The user hasn't already reviewed this reservation
     * - Rating is 1-5
     */
    public function createReview(User $user, Resort $resort, array $data): ResortReview
    {
        $validated = validator($data, [
            'reservation_id' => ['required', 'integer', 'exists:reservations,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ])->validate();

        $reservationId = $validated['reservation_id'];

        // Verify the reservation belongs to this user and resort and is completed
        $reservation = Reservation::where('id', $reservationId)
            ->where('user_id', $user->id)
            ->where('resort_id', $resort->id)
            ->where('status', 'completed')
            ->first();

        if (! $reservation) {
            throw ValidationException::withMessages([
                'reservation_id' => ['You can only review completed reservations at this resort.'],
            ]);
        }

        // Check for duplicate review
        $existing = ResortReview::where('reservation_id', $reservationId)->exists();
        if ($existing) {
            throw ValidationException::withMessages([
                'reservation_id' => ['You have already reviewed this reservation.'],
            ]);
        }

        return ResortReview::create([
            'resort_id' => $resort->id,
            'user_id' => $user->id,
            'reservation_id' => $reservationId,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
            'is_visible' => true,
        ]);
    }

    /**
     * Get paginated visible reviews for a resort (public).
     */
    public function getResortReviews(Resort $resort, int $perPage = 10): LengthAwarePaginator
    {
        return ResortReview::where('resort_id', $resort->id)
            ->where('is_visible', true)
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Get rating summary for a resort.
     * Consolidated from 7 queries to 2 using GROUP BY for the star breakdown.
     */
    public function getResortRatingSummary(Resort $resort): array
    {
        // Query 1: total + average in one aggregation
        $summaryRow = ResortReview::where('resort_id', $resort->id)
            ->where('is_visible', true)
            ->selectRaw('COUNT(*) as total, AVG(rating) as avg_rating')
            ->first();

        $total = (int) ($summaryRow->total ?? 0);
        $average = $total > 0 ? round((float) $summaryRow->avg_rating, 1) : null;

        // Query 2: star breakdown via GROUP BY
        $breakdownRows = ResortReview::where('resort_id', $resort->id)
            ->where('is_visible', true)
            ->selectRaw('rating, COUNT(*) as count')
            ->groupBy('rating')
            ->pluck('count', 'rating')
            ->toArray();

        $breakdown = [];
        for ($i = 5; $i >= 1; $i--) {
            $count = (int) ($breakdownRows[$i] ?? 0);
            $breakdown[$i] = [
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100) : 0,
            ];
        }

        return [
            'average_rating' => $average,
            'total_reviews' => $total,
            'breakdown' => $breakdown,
        ];
    }

    /**
     * Batch-compute rating summaries for multiple resort IDs.
     * Returns [resort_id => ['average_rating' => ..., 'total_reviews' => ...]]
     */
    public function batchRatingSummaries(array $resortIds): array
    {
        if (empty($resortIds)) {
            return [];
        }

        $rows = ResortReview::whereIn('resort_id', $resortIds)
            ->where('is_visible', true)
            ->selectRaw('resort_id, AVG(rating) as avg_rating, COUNT(*) as total')
            ->groupBy('resort_id')
            ->get();

        $result = [];
        foreach ($resortIds as $id) {
            $row = $rows->first(fn ($r) => (int) $r->resort_id === (int) $id);
            $result[(int) $id] = [
                'average_rating' => $row ? round((float) $row->avg_rating, 1) : null,
                'total_reviews' => $row ? (int) $row->total : 0,
            ];
        }

        return $result;
    }

    /**
     * Toggle review visibility (admin).
     */
    public function toggleVisibility(ResortReview $review): ResortReview
    {
        $review->update(['is_visible' => ! $review->is_visible]);
        return $review->fresh();
    }

    /**
     * Get all reviews for admin management.
     */
    public function listAllReviews(?string $search = null, ?string $filter = null, int $perPage = 15): LengthAwarePaginator
    {
        $query = ResortReview::with(['resort:id,name', 'user:id,name,email'])
            ->orderByDesc('created_at');

        if ($search) {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like): void {
                $q->where('comment', 'like', $like)
                    ->orWhereHas('resort', fn ($r) => $r->where('name', 'like', $like))
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $like));
            });
        }

        if ($filter === 'hidden') {
            $query->where('is_visible', false);
        } elseif ($filter === 'visible') {
            $query->where('is_visible', true);
        } elseif ($filter === 'low_rating') {
            $query->where('rating', '<=', 2);
        }

        return $query->paginate($perPage);
    }
}
