"use client";

import AdminResortVerificationReviewModal from "@/components/dashboard/AdminResortVerificationReviewModal";
import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import DashTableScrollRegion from "@/components/shared/DashTableScrollRegion";
import { TableEntityNameWithId } from "@/components/shared/EntityIdHint";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
import {
  listResortVerifications,
  type VerificationQueueFilter,
  type VerificationQueueItem,
} from "@/lib/api/adminResortVerification";
import { VERIFICATION_METHOD_LABELS } from "@/lib/onboarding/labels";
import { extractLaravelMeta, type LaravelTableMeta } from "@/lib/tableSortPagination";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { cn } from "@/lib/utils";
import { Eye, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const FILTERS: { key: VerificationQueueFilter; label: string }[] = [
  { key: "awaiting_review", label: "Awaiting review" },
  { key: "needs_documents", label: "Needs documents" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function statusBadge(status: string) {
  if (status === "verified") return "dash-badge-emerald";
  if (status === "rejected") return "dash-badge-rose";
  if (status === "needs_documents") return "dash-badge-amber";
  return "dash-badge-amber";
}

function formatSubmitted(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function AdminResortVerificationsPage() {
  const [items, setItems] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<VerificationQueueFilter>("awaiting_review");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [reviewId, setReviewId] = useState<number | null>(null);

  const load = useCallback(
    async (f: VerificationQueueFilter, q: string, pg: number, pp: number) => {
      setLoading(true);
      try {
        const res = await listResortVerifications({ filter: f, search: q || undefined, page: pg, perPage: pp });
        setItems(res.data ?? []);
        setMeta(extractLaravelMeta(res));
        setError(null);
      } catch {
        setItems([]);
        setMeta(null);
        setError("Failed to load verification queue.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(filter, query, page, perPage);
  }, [filter, query, page, perPage, load]);

  const onSearch = () => {
    setQuery(sanitizeSearchQuery(search));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <ShieldCheck size={22} className="text-clTeal" />
          Resort verification
        </h1>
        <p className="dash-page-sub">
          Review owner-submitted documents and approve or reject resorts before they go live on the platform.
        </p>
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
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
        >
          <DashboardFilterSearch
            value={search}
            onChange={setSearch}
            placeholder="Search resort or subdomain…"
            wide
          />
        </form>
        <span className="ml-auto shrink-0 text-xs text-zinc-500">
          {meta?.total ?? items.length} resort{(meta?.total ?? items.length) !== 1 ? "s" : ""}
        </span>
      </div>

      <DashCard className="overflow-hidden p-0">
        {loading ? (
          <>
            <div className="p-4 md:hidden">
              <DashMobileTableSkeleton rows={4} />
            </div>
            <div className="hidden space-y-2 p-4 md:block">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-softGray" />
              ))}
            </div>
          </>
        ) : error ? (
          <p className="px-6 py-10 text-center text-sm text-rose-700">{error}</p>
        ) : items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">
            {filter === "awaiting_review"
              ? "No resorts awaiting verification review."
              : "No resorts match this filter."}
          </p>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {items.map((row) => (
                <DashMobileTableCard
                  key={row.id}
                  title={<TableEntityNameWithId name={row.name} id={row.id} />}
                  fields={[
                    {
                      label: "Status",
                      value: (
                        <span className={statusBadge(row.verification_status)}>
                          {row.verification_status}
                        </span>
                      ),
                    },
                    {
                      label: "Method",
                      value: row.verification_method
                        ? (VERIFICATION_METHOD_LABELS[row.verification_method] ?? row.verification_method)
                        : "—",
                    },
                    { label: "Submitted", value: formatSubmitted(row.verification_submitted_at) },
                    { label: "Rooms", value: String(row.rooms_count) },
                  ]}
                  actions={
                    <button
                      type="button"
                      className="dash-btn-sm w-full justify-center"
                      onClick={() => setReviewId(row.id)}
                    >
                      <Eye size={14} />
                      Review
                    </button>
                  }
                />
              ))}
            </div>
            <div className="hidden md:block">
              <DashTableScrollRegion label="Resort verification queue">
                <table className="dash-table w-full">
                  <thead>
                    <tr>
                      <th>Resort</th>
                      <th>Status</th>
                      <th>Method</th>
                      <th>Submitted</th>
                      <th>Rooms</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <TableEntityNameWithId name={row.name} id={row.id} />
                          {row.subdomain ? (
                            <p className="text-xs text-zinc-500">{row.subdomain}</p>
                          ) : null}
                        </td>
                        <td>
                          <span className={statusBadge(row.verification_status)}>
                            {row.verification_status}
                          </span>
                        </td>
                        <td className="text-sm text-zinc-700">
                          {row.verification_method
                            ? (VERIFICATION_METHOD_LABELS[row.verification_method] ?? row.verification_method)
                            : "—"}
                        </td>
                        <td className="text-sm text-zinc-600">
                          {formatSubmitted(row.verification_submitted_at)}
                        </td>
                        <td className="text-sm tabular-nums">{row.rooms_count}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="dash-btn-sm inline-flex items-center gap-1"
                            onClick={() => setReviewId(row.id)}
                          >
                            <Eye size={14} />
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DashTableScrollRegion>
            </div>
            <TablePaginationBar
              page={page}
              lastPage={meta?.last_page ?? 1}
              total={meta?.total ?? items.length}
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

      <AdminResortVerificationReviewModal
        resortId={reviewId}
        open={reviewId != null}
        onClose={() => setReviewId(null)}
        onResolved={() => void load(filter, query, page, perPage)}
      />
    </div>
  );
}
