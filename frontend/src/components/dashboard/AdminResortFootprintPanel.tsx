"use client";

import { SubscriptionPlanLabel } from "@/components/badges/SubscriptionPlanLabel";
import { EntityIdHint } from "@/components/shared/EntityIdHint";
import { TableEntityThumb } from "@/components/shared/TableEntityThumb";
import { listResorts, type ResortItem } from "@/lib/api/resort";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { extractLaravelMeta } from "@/lib/tableSortPagination";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AdminResortFootprintPanelProps = {
  totalResorts: number;
  publicResorts: number;
  suspendedResorts: number;
  /** Resorts shown per page in this widget */
  defaultPerPage?: number;
};

function resortLocationLine(r: ResortItem): string {
  const line =
    (r.address_display?.trim() || r.address_label?.trim() || r.address?.trim() || "").replace(/\s+/g, " ");
  return line !== "" ? line : "Address not set";
}

export default function AdminResortFootprintPanel({
  totalResorts,
  publicResorts,
  suspendedResorts,
  defaultPerPage = 3,
}: AdminResortFootprintPanelProps) {
  const [resorts, setResorts] = useState<ResortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [lastPage, setLastPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);

  const load = useCallback(
    async (pg: number, pp: number) => {
      setLoading(true);
      try {
        const res = await listResorts({
          perPage: pp,
          page: pg,
          sort_by: "name",
          sort_dir: "asc",
        });
        setResorts(res.data ?? []);
        const meta = extractLaravelMeta(res);
        setListTotal(meta?.total ?? res.data?.length ?? 0);
        setLastPage(Math.max(1, meta?.last_page ?? 1));
        setError(null);
      } catch (err) {
        setResorts([]);
        setListTotal(0);
        setLastPage(1);
        setError(parseApiErrorMessage(err, "Could not load resorts."));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(page, perPage);
  }, [load, page, perPage]);

  const onPageChange = (next: number) => {
    setPage(next);
  };

  const onPerPageChange = (pp: number) => {
    setPerPage(pp);
    setPage(1);
  };

  const unlisted = Math.max(0, totalResorts - publicResorts);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <p className="rounded-lg border border-softBorder bg-softGray/40 px-3 py-2">
          <span className="text-zinc-500">On platform:</span>{" "}
          <span className="font-semibold text-navy">{totalResorts}</span>
        </p>
        <p className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
          <span className="text-zinc-600">Listed:</span>{" "}
          <span className="font-semibold text-emerald-800">{publicResorts}</span>
        </p>
        <p className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
          <span className="text-zinc-500">Unlisted:</span>{" "}
          <span className="font-semibold text-navy">{unlisted}</span>
        </p>
        {suspendedResorts > 0 ? (
          <p className="rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2">
            <span className="text-zinc-600">Suspended:</span>{" "}
            <span className="font-semibold text-rose-800">{suspendedResorts}</span>
          </p>
        ) : null}
      </div>

      {loading && resorts.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading resorts…</p>
      ) : error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : resorts.length === 0 ? (
        <p className="text-sm text-zinc-500">No resorts onboarded yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-softBorder bg-white">
          <ul className="divide-y divide-softBorder" aria-label="Resorts on platform">
            {resorts.map((r) => (
              <li key={r.id} className={loading ? "pointer-events-none opacity-60" : undefined}>
                <Link
                  href="/dashboard/admin/resorts"
                  className="flex items-center gap-3 px-3 py-3 transition hover:bg-softGray/50 sm:px-4"
                >
                  <TableEntityThumb
                    imageUrl={r.logo_url}
                    name={r.name}
                    kind="resort"
                    size="sm"
                    className="h-10 w-10 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-dash text-sm font-semibold text-navy">{r.name}</p>
                    <EntityIdHint id={r.id} className="mt-0.5" />
                    <p className="mt-0.5 flex items-start gap-1 text-xs text-zinc-500">
                      <MapPin size={12} className="mt-0.5 shrink-0 text-zinc-400" aria-hidden />
                      <span className="line-clamp-2">{resortLocationLine(r)}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className={r.is_publicly_listed ? "dash-badge-emerald" : "dash-badge-slate"}>
                        {r.is_publicly_listed ? "Listed" : "Unlisted"}
                      </span>
                      {r.subscription?.plan ? (
                        <SubscriptionPlanLabel plan={r.subscription.plan} className="text-[10px]" />
                      ) : null}
                      {r.rooms_count != null ? (
                        <span className="text-[10px] font-medium text-zinc-500">{r.rooms_count} rooms</span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-zinc-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-softBorder pt-3">
        <Link href="/dashboard/admin/resorts" className="dash-btn-sm inline-flex shrink-0 items-center gap-1">
          <Building2 size={14} aria-hidden />
          Manage resorts
        </Link>
      </div>
    </div>
  );
}
