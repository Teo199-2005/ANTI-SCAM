"use client";

import { getPublicResortReviews, getPublicResortReviewSummary, type ResortReviewItem, type ResortReviewSummary } from "@/lib/api/reviews";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  resortId: number;
  surface?: string;
};

export function ResortReviewsSection({ resortId, surface }: Props) {
  const [reviews, setReviews] = useState<ResortReviewItem[]>([]);
  const [summary, setSummary] = useState<ResortReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [reviewData, summaryData] = await Promise.all([
          getPublicResortReviews(resortId, 1, 10),
          getPublicResortReviewSummary(resortId),
        ]);
        if (cancelled) return;
        setReviews(reviewData.data);
        setSummary(summaryData);
        setTotalPages(reviewData.meta.last_page);
        setHasMore(reviewData.meta.current_page < reviewData.meta.last_page);
      } catch {
        // silently fail — reviews are supplementary
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [resortId]);

  const loadMore = async () => {
    const nextPage = page + 1;
    try {
      const data = await getPublicResortReviews(resortId, nextPage, 10);
      setReviews((prev) => [...prev, ...data.data]);
      setPage(nextPage);
      setHasMore(nextPage < data.meta.last_page);
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <section id={surface} className="resort-landing-section">
        <div className="resort-landing-container px-4 py-12 text-center text-zinc-500">
          Loading reviews…
        </div>
      </section>
    );
  }

  if (!summary || summary.total_reviews === 0) {
    return (
      <section id={surface} className="resort-landing-section">
        <div className="resort-landing-container px-4 py-12 text-center">
          <h2 className="font-heading text-2xl font-bold text-zinc-900">Guest Reviews</h2>
          <p className="mt-2 text-sm text-zinc-500">No reviews yet. Be the first to share your experience!</p>
        </div>
      </section>
    );
  }

  return (
    <section id={surface} className="resort-landing-section bg-white">
      <div className="resort-landing-container mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <h2 className="font-heading text-2xl font-bold text-zinc-900 sm:text-3xl">Guest Reviews</h2>

        {/* Rating summary */}
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          {/* Average rating circle */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold text-zinc-900">
                {summary.average_rating?.toFixed(1) ?? "0"}
              </span>
              <Star size={28} className="fill-amber-400 text-amber-400" aria-hidden />
            </div>
            <span className="text-sm text-zinc-500">
              {summary.total_reviews} review{summary.total_reviews !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Star breakdown bars */}
          <div className="flex-1 space-y-1.5 min-w-0">
            {[5, 4, 3, 2, 1].map((star) => {
              const entry = summary.breakdown[star];
              const pct = entry?.percentage ?? 0;
              const count = entry?.count ?? 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-right font-medium text-zinc-600">{star}</span>
                  <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" aria-hidden />
                  <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-zinc-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review list */}
        <div className="mt-8 divide-y divide-zinc-100">
          {reviews.map((review) => (
            <div key={review.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 truncate">
                      {review.user_name}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          className={cn(
                            s <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-zinc-200 text-zinc-200",
                          )}
                          aria-hidden
                        />
                      ))}
                    </div>
                  </div>
                  <time className="text-xs text-zinc-400" dateTime={review.created_at}>
                    {new Date(review.created_at).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
              </div>
              {review.comment ? (
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{review.comment}</p>
              ) : null}
            </div>
          ))}
        </div>

        {/* Load more */}
        {hasMore ? (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => void loadMore()}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm"
            >
              Show more reviews
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
