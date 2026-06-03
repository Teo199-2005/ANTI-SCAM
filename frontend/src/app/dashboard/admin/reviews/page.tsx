"use client";

import { useToast } from "@/components/shared/ToastProvider";
import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
import {
  getAdminReviews,
  toggleAdminReviewVisibility,
  type AdminReviewItem,
} from "@/lib/api/reviews";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { extractLaravelMeta, type LaravelTableMeta } from "@/lib/tableSortPagination";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, MessageSquare, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const FILTERS = [
  { key: "", label: "All" },
  { key: "visible", label: "Visible" },
  { key: "hidden", label: "Hidden" },
  { key: "low_rating", label: "Low rating" },
];

function ratingStars(rating: number) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          className={s <= rating ? "fill-amber-400 text-amber-500" : "text-zinc-300"}
          aria-hidden
        />
      ))}
    </span>
  );
}

export default function AdminReviewsPage() {
  const { pushToast } = useToast();
  const [items, setItems] = useState<AdminReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminReviews({
        search: query || undefined,
        filter: filter || undefined,
        page,
        perPage,
      });
      setItems(res.data ?? []);
      setMeta(extractLaravelMeta(res));
      setError(null);
    } catch {
      setItems([]);
      setMeta(null);
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [filter, query, page, perPage]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(sanitizeSearchQuery(search));
    setPage(1);
  };

  const handleToggleVisibility = async (review: AdminReviewItem) => {
    setTogglingId(review.id);
    try {
      await toggleAdminReviewVisibility(review.id);
      setItems((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, is_visible: !r.is_visible } : r)),
      );
      pushToast({
        title: review.is_visible ? "Review hidden" : "Review shown",
        tone: "success",
      });
    } catch (err) {
      pushToast({
        title: "Update failed",
        description: parseApiErrorMessage(err, "Could not update review visibility."),
        tone: "error",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? items.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <MessageSquare size={22} className="text-skyBlue" />
          Resort reviews
        </h1>
        <p className="dash-page-sub">Manage guest reviews and ratings across all resorts.</p>
      </div>

      <div className="dash-filter-bar flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={cn(
              "dash-filter-segment",
              filter === f.key ? "dash-filter-segment--active" : "dash-filter-segment--idle",
            )}
          >
            {f.label}
          </button>
        ))}
        <form
          className="flex min-w-[12rem] flex-1 items-center gap-2"
          onSubmit={onSearch}
        >
          <DashboardFilterSearch
            value={search}
            onChange={setSearch}
            placeholder="Search resort, guest, or comment…"
            wide
          />
        </form>
        <span className="ml-auto shrink-0 text-xs text-zinc-500">
          {total} review{total !== 1 ? "s" : ""}
        </span>
      </div>

      <DashCard className="overflow-hidden p-0">
        {loading ? (
          <div className="p-4 md:hidden">
            <DashMobileTableSkeleton rows={4} />
          </div>
        ) : error ? (
          <p className="px-6 py-10 text-center text-sm text-rose-700">{error}</p>
        ) : items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">No reviews found.</p>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {items.map((review) => (
                <DashMobileTableCard
                  key={review.id}
                  title={
                    <span className="flex items-center gap-2">
                      {ratingStars(review.rating)}
                      <span className="text-xs text-zinc-500">{review.resort_name ?? "Resort"}</span>
                    </span>
                  }
                  fields={[
                    { label: "Guest", value: review.user_name ?? "—" },
                    {
                      label: "Comment",
                      value: review.comment ? (review.comment.length > 80 ? review.comment.slice(0, 80) + "…" : review.comment) : "No comment",
                    },
                    {
                      label: "Visible",
                      value: (
                        <span className={review.is_visible ? "dash-badge-emerald" : "dash-badge-slate"}>
                          {review.is_visible ? "Visible" : "Hidden"}
                        </span>
                      ),
                    },
                    { label: "Date", value: new Date(review.created_at).toLocaleDateString() },
                  ]}
                  actions={
                    <button
                      type="button"
                      disabled={togglingId === review.id}
                      onClick={() => void handleToggleVisibility(review)}
                      className="dash-btn-sm w-full justify-center"
                    >
                      {review.is_visible ? <EyeOff size={14} /> : <Eye size={14} />}
                      {review.is_visible ? "Hide" : "Show"}
                    </button>
                  }
                />
              ))}
            </div>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="dash-table w-full">
                  <thead>
                    <tr>
                      <th>Resort</th>
                      <th>Guest</th>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Visible</th>
                      <th>Date</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((review) => (
                      <tr key={review.id}>
                        <td className="text-sm font-medium text-navy">{review.resort_name ?? "—"}</td>
                        <td className="text-sm text-zinc-700">
                          {review.user_name ?? "—"}
                          {review.user_email ? (
                            <p className="text-xs text-zinc-400">{review.user_email}</p>
                          ) : null}
                        </td>
                        <td>{ratingStars(review.rating)}</td>
                        <td className="max-w-[20rem] truncate text-sm text-zinc-600">
                          {review.comment ?? "—"}
                        </td>
                        <td>
                          <span className={review.is_visible ? "dash-badge-emerald" : "dash-badge-slate"}>
                            {review.is_visible ? "Visible" : "Hidden"}
                          </span>
                        </td>
                        <td className="text-sm text-zinc-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            disabled={togglingId === review.id}
                            onClick={() => void handleToggleVisibility(review)}
                            className="dash-btn-sm inline-flex items-center gap-1"
                          >
                            {review.is_visible ? <EyeOff size={14} /> : <Eye size={14} />}
                            {review.is_visible ? "Hide" : "Show"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <TablePaginationBar
              page={page}
              lastPage={lastPage}
              total={total}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={(pp) => {
                setPerPage(pp);
                setPage(1);
              }}
            />
          </>
        )}
      </DashCard>
    </div>
  );
}
