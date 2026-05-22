"use client";

import DashCard from "@/components/dash/DashCard";
import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import DataTable from "@/components/shared/DataTable";
import {
  DashTableActionsCell,
  DashTableActionsHead,
} from "@/components/shared/DashTableActions";
import SortableTh from "@/components/shared/SortableTh";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import LocationFilterBar, {
  emptyLocationFilter,
  locationFilterToParams,
  type LocationFilterValue,
} from "@/components/locations/LocationFilterBar";
import AdminMarketerDetailModal from "@/components/dashboard/AdminMarketerDetailModal";
import {
  getAdminMarketersMonitoring,
  type AdminMarketerMonitorRow,
  type AdminMarketerMonitoringPayload,
} from "@/lib/api/admin";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { compareNullable, nextSort, paginateLocal, type SortDir } from "@/lib/tableSortPagination";
import { cn } from "@/lib/utils";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
import { TableEntityThumb } from "@/components/shared/TableEntityThumb";
import { Activity, Eye, Info, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPhpLedger as fmtPhp } from "@/lib/formatPhp";

const SORT_FIRST: Record<string, SortDir> = {
  name: "asc",
  assigned_resorts_count: "desc",
  referred_clients_count: "desc",
  referred_resorts_count: "desc",
  months_since_last_new_referred_resort: "desc",
  joined_at: "desc",
  last_any_referral_payment_at: "desc",
  commission_pending_php: "desc",
  commission_released_gross_php: "desc",
  commission_total_gross_php: "desc",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function IdleBadge({ months, referredCount }: { months: number | null; referredCount: number }) {
  if (referredCount === 0) {
    return <span className="dash-badge-rose text-[10px]">No clients</span>;
  }
  if (months === null) return <span className="dash-badge-slate text-[10px]">—</span>;
  if (months >= 6) return <span className="dash-badge-rose text-[10px]">{months}mo idle</span>;
  if (months >= 3) return <span className="dash-badge-amber text-[10px]">{months}mo idle</span>;
  return <span className="dash-badge-emerald text-[10px]">{months}mo idle</span>;
}

const MONITOR_TABLE_COMPACT = "[&_th]:px-2.5 [&_td]:px-2.5 [&_th]:py-2.5 [&_td]:py-2.5";

function FunnelCounts({ r }: { r: AdminMarketerMonitorRow }) {
  return (
    <div className="space-y-0.5 text-[11px] leading-snug tabular-nums">
      <p title="Resorts assigned to this partner for outreach">
        <span className="text-zinc-500">Assigned </span>
        <span className="font-semibold text-navy">{r.assigned_resorts_count}</span>
      </p>
      <p title="Referred owner accounts with qualifying payments">
        <span className="text-zinc-500">Clients </span>
        <span className="font-semibold text-navy">{r.referred_clients_count}</span>
      </p>
      <p title="Referred resorts with qualifying payments">
        <span className="text-zinc-500">Resorts </span>
        <span className="font-semibold text-navy">{r.referred_resorts_count}</span>
      </p>
    </div>
  );
}

function BookingCounts({ r }: { r: AdminMarketerMonitorRow }) {
  return (
    <div className="space-y-0.5 text-[11px] leading-snug tabular-nums">
      <p title="Qualifying guest bookings that earned commission">
        <span className="text-zinc-500">Credited </span>
        <span className="font-semibold text-navy">{r.booking_credits_count ?? 0}</span>
      </p>
      <p title="Bookings where commission was reversed (e.g. cancellation)">
        <span className="text-zinc-500">Reversed </span>
        <span className="font-semibold text-navy">{r.booking_reversals_count ?? 0}</span>
      </p>
    </div>
  );
}

function CommissionStack({ r }: { r: AdminMarketerMonitorRow }) {
  return (
    <div className="space-y-0.5 text-right text-[11px] leading-snug tabular-nums">
      <p title="Commission earned, not yet paid out">
        <span className="text-zinc-500">Pending </span>
        {fmtPhp(r.commission_pending_php)}
      </p>
      <p title="Commission already paid to this partner">
        <span className="text-zinc-500">Released </span>
        {fmtPhp(r.commission_released_gross_php)}
      </p>
      <p className="font-semibold text-navy" title="Pending + released (lifetime gross)">
        <span className="font-normal text-zinc-500">Total </span>
        {fmtPhp(r.commission_total_gross_php)}
      </p>
    </div>
  );
}

export default function AdminMarketingMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<AdminMarketerMonitoringPayload["meta"] | null>(null);
  const [rows, setRows] = useState<AdminMarketerMonitorRow[]>([]);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>("months_since_last_new_referred_resort");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>(emptyLocationFilter);
  const [detailMarketerId, setDetailMarketerId] = useState<number | null>(null);

  const load = useCallback(async (search: string, loc: LocationFilterValue = locationFilter) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAdminMarketersMonitoring(search || undefined, locationFilterToParams(loc));
      setRows(payload.rows);
      setMeta(payload.meta);
    } catch (err) {
      setRows([]);
      setMeta(null);
      setError(parseApiErrorMessage(err, "Failed to load marketing partners."));
    } finally {
      setLoading(false);
    }
  }, [locationFilter]);

  useEffect(() => {
    void load("");
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied(query);
    setPage(1);
    void load(query);
  };

  const bookingTotals = useMemo(() => {
    let credits = 0;
    let reversals = 0;
    for (const r of rows) {
      credits += r.booking_credits_count ?? 0;
      reversals += r.booking_reversals_count ?? 0;
    }
    return { credits, reversals };
  }, [rows]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return compareNullable(a.name, b.name, sortDir);
        case "joined_at":
          return compareNullable(
            a.joined_at ? new Date(a.joined_at).getTime() : null,
            b.joined_at ? new Date(b.joined_at).getTime() : null,
            sortDir,
          );
        case "assigned_resorts_count":
          return compareNullable(a.assigned_resorts_count, b.assigned_resorts_count, sortDir);
        case "referred_clients_count":
          return compareNullable(a.referred_clients_count, b.referred_clients_count, sortDir);
        case "referred_resorts_count":
          return compareNullable(a.referred_resorts_count, b.referred_resorts_count, sortDir);
        case "months_since_last_new_referred_resort":
          return compareNullable(
            a.months_since_last_new_referred_resort ?? -1,
            b.months_since_last_new_referred_resort ?? -1,
            sortDir,
          );
        case "last_any_referral_payment_at":
          return compareNullable(
            a.last_any_referral_payment_at ? new Date(a.last_any_referral_payment_at).getTime() : null,
            b.last_any_referral_payment_at ? new Date(b.last_any_referral_payment_at).getTime() : null,
            sortDir,
          );
        case "commission_pending_php":
          return compareNullable(a.commission_pending_php, b.commission_pending_php, sortDir);
        case "commission_released_gross_php":
          return compareNullable(a.commission_released_gross_php, b.commission_released_gross_php, sortDir);
        case "commission_total_gross_php":
          return compareNullable(a.commission_total_gross_php, b.commission_total_gross_php, sortDir);
        case "booking_credits_count":
          return compareNullable(a.booking_credits_count ?? 0, b.booking_credits_count ?? 0, sortDir);
        case "booking_reversals_count":
          return compareNullable(a.booking_reversals_count ?? 0, b.booking_reversals_count ?? 0, sortDir);
        default:
          return 0;
      }
    });
    return copy;
  }, [rows, sortBy, sortDir]);

  const { slice: pageRows, meta: pageMeta } = useMemo(
    () => paginateLocal(sortedRows, page, perPage),
    [sortedRows, page, perPage],
  );

  const onSort = (key: string) => {
    const n = nextSort(key, sortBy, sortDir, SORT_FIRST[key] ?? "asc");
    setSortBy(n.key);
    setSortDir(n.dir);
    setPage(1);
  };

  const paginationFooter =
    sortedRows.length > 0 ? (
      <TablePaginationBar
        page={pageMeta.current_page}
        lastPage={pageMeta.last_page}
        total={pageMeta.total}
        perPage={perPage}
        onPerPageChange={(pp) => {
          setPerPage(pp);
          setPage(1);
        }}
        onPageChange={setPage}
        disabled={loading}
      />
    ) : null;

  const colSpan = 7;

  return (
    <div className="space-y-6">
      <div className="dash-page-header">
        <h1 className="dash-page-title flex items-center gap-2">
          <Activity size={24} className="text-skyBlue" />
          Marketing monitor
        </h1>
        <p className="dash-page-sub">
          Referral signup funnel, booking commissions (paid online guest bookings), idle time since the last new client,
          and commission balances. Sorted with the longest idle periods first.
        </p>

        <form onSubmit={onSearch} className="dash-filter-bar">
          <DashboardFilterSearch
            value={query}
            onChange={(v) => setQuery(sanitizeSearchQuery(v))}
            placeholder="Search name, email, or referral code…"
            wide
          />
          <LocationFilterBar
            label="Mailing address"
            value={locationFilter}
            onChange={(next) => {
              setLocationFilter(next);
              setPage(1);
              void load(applied, next);
            }}
          />
          <button
            type="button"
            onClick={() => void load(applied)}
            className="dash-filter-clear ml-auto inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
            Refresh
          </button>
        </form>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/95 via-white to-fuchsia-50/80 px-4 py-3 text-xs text-violet-950 shadow-sm">
          <span className="font-bold uppercase tracking-wide text-violet-900/80">Booking commissions</span>
          <span className="inline-flex rounded-full border border-violet-200 bg-white px-2.5 py-0.5 font-semibold tabular-nums">
            {bookingTotals.credits} credited
          </span>
          {bookingTotals.reversals > 0 ? (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-semibold tabular-nums text-amber-900">
              {bookingTotals.reversals} reversed
            </span>
          ) : null}
          {meta?.commission_per_booking_php != null ? (
            <span className="text-violet-800">{fmtPhp(meta.commission_per_booking_php)} per qualifying booking</span>
          ) : null}
        </div>
      ) : null}

      {meta?.new_client_definition ? (
        <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50/90 px-4 py-3 text-xs text-sky-950">
          <Info className="mt-0.5 shrink-0 text-sky-700" size={18} />
          <div>
            <p className="font-semibold text-sky-900">How “new client” is counted</p>
            <p className="mt-1 leading-relaxed text-sky-900/85">{meta.new_client_definition}</p>
            {meta.generated_at ? (
              <p className="mt-2 text-[11px] text-sky-800/70">Snapshot: {fmtDate(meta.generated_at)}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {meta?.booking_commission_policy ? (
        <div className="rounded-2xl border border-softBorder bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Booking commission policy</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">{meta.booking_commission_policy}</p>
        </div>
      ) : null}

      <DashCard className="overflow-hidden p-0">
        <div className="border-b border-softBorderStrong bg-softCard px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Marketers ({sortedRows.length})
          </p>
        </div>

        <div className="md:hidden">
          {loading && rows.length === 0 ? (
            <div className="p-4">
              <DashMobileTableSkeleton rows={4} />
            </div>
          ) : error ? (
            <div className="dash-alert-error m-4">{error}</div>
          ) : sortedRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-600">No marketers match this search.</div>
          ) : (
            <div className="space-y-3 p-4">
              {pageRows.map((r) => (
                <DashMobileTableCard
                  key={r.id}
                  title={
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <TableEntityThumb imageUrl={r.avatar_url} name={r.name} kind="person" size="sm" />
                      <span className="min-w-0 truncate">{r.name}</span>
                    </span>
                  }
                  fields={[
                    { label: "Email", value: r.email },
                    ...(r.referral_code ? [{ label: "Code", value: r.referral_code }] : []),
                    {
                      label: "Referrals",
                      value: (
                        <span className="text-xs tabular-nums">
                          Assigned {r.assigned_resorts_count} · Clients {r.referred_clients_count} · Resorts{" "}
                          {r.referred_resorts_count}
                        </span>
                      ),
                    },
                    {
                      label: "Bookings",
                      value: (
                        <span className="text-xs tabular-nums">
                          Credited {r.booking_credits_count ?? 0} · Reversed {r.booking_reversals_count ?? 0}
                        </span>
                      ),
                    },
                    {
                      label: "Idle (new client)",
                      value: (
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <IdleBadge
                            months={r.months_since_last_new_referred_resort}
                            referredCount={r.referred_clients_count}
                          />
                          <span className="text-xs text-zinc-500">
                            Last new:{" "}
                            {r.last_new_referred_resort_at
                              ? fmtDate(r.last_new_referred_resort_at).split(",")[0]
                              : "—"}
                          </span>
                        </span>
                      ),
                    },
                    { label: "Last referral payment", value: fmtDate(r.last_any_referral_payment_at) },
                    {
                      label: "Commissions",
                      value: (
                        <span className="text-xs tabular-nums">
                          Pending {fmtPhp(r.commission_pending_php)} · Released{" "}
                          {fmtPhp(r.commission_released_gross_php)} · Total {fmtPhp(r.commission_total_gross_php)}
                        </span>
                      ),
                    },
                  ]}
                  actions={
                    <button
                      type="button"
                      className="dash-btn-sm inline-flex w-full items-center justify-center gap-1.5 border border-zinc-200 bg-white"
                      onClick={() => setDetailMarketerId(r.id)}
                    >
                      <Eye size={13} aria-hidden />
                      View details
                    </button>
                  }
                />
              ))}
            </div>
          )}
          {paginationFooter ? <div className="border-t border-softBorder px-2 py-1">{paginationFooter}</div> : null}
        </div>

        <div className="hidden md:block">
          <DataTable
            minWidthClass="w-full min-w-0"
            tableClassName={cn("table-fixed", MONITOR_TABLE_COMPACT)}
            scrollRegionLabel="Marketing partners table"
            colgroup={
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
            }
            footer={paginationFooter ?? undefined}
            headers={
              <>
                <SortableTh label="Marketer" sortKey="name" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                <SortableTh
                  label="Referrals"
                  sortKey="referred_clients_count"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="center"
                  className="text-center"
                />
                <SortableTh
                  label="Bookings"
                  sortKey="booking_credits_count"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="center"
                  className="text-center"
                />
                <SortableTh
                  label="Idle"
                  sortKey="months_since_last_new_referred_resort"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="center"
                  className="text-center"
                />
                <SortableTh
                  label="Last paid"
                  sortKey="last_any_referral_payment_at"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="center"
                  className="text-center"
                />
                <SortableTh
                  label="Commissions"
                  sortKey="commission_total_gross_php"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="right"
                  className="text-right"
                />
                <DashTableActionsHead>Actions</DashTableActionsHead>
              </>
            }
          >
            <AsyncStatePanel
              loading={loading}
              error={error}
              isEmpty={!loading && !error && sortedRows.length === 0}
              emptyText="No marketers match this search."
              withinTable
              colSpan={colSpan}
            >
              {pageRows.map((r) => (
                <tr key={r.id} className="group">
                  <td className="max-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <TableEntityThumb imageUrl={r.avatar_url} name={r.name} kind="person" size="sm" />
                      <div className="min-w-0 overflow-hidden">
                        <div className="truncate font-semibold text-navy">{r.name}</div>
                        <div className="truncate text-[11px] text-zinc-500">{r.email}</div>
                        {r.referral_code ? (
                          <div className="truncate font-mono text-[10px] text-violet-700">{r.referral_code}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>
                    <FunnelCounts r={r} />
                  </td>
                  <td>
                    <BookingCounts r={r} />
                  </td>
                  <td>
                    <IdleBadge
                      months={r.months_since_last_new_referred_resort}
                      referredCount={r.referred_clients_count}
                    />
                    <p className="mt-1 truncate text-[10px] text-zinc-500" title={fmtDate(r.last_new_referred_resort_at)}>
                      {r.last_new_referred_resort_at ? fmtDate(r.last_new_referred_resort_at).split(",")[0] : "—"}
                    </p>
                  </td>
                  <td className="text-center text-[11px] text-zinc-700">
                    <span className="line-clamp-2">{fmtDate(r.last_any_referral_payment_at)}</span>
                  </td>
                  <td>
                    <CommissionStack r={r} />
                  </td>
                  <DashTableActionsCell>
                    <button
                      type="button"
                      className="dash-btn-sm inline-flex items-center gap-1 border border-zinc-200 bg-white px-2 py-1 text-[11px]"
                      onClick={() => setDetailMarketerId(r.id)}
                      aria-label={`View details for ${r.name}`}
                    >
                      <Eye size={12} aria-hidden />
                      View
                    </button>
                  </DashTableActionsCell>
                </tr>
              ))}
            </AsyncStatePanel>
          </DataTable>
        </div>
      </DashCard>

      <AdminMarketerDetailModal
        marketerId={detailMarketerId}
        open={detailMarketerId != null}
        onClose={() => setDetailMarketerId(null)}
      />
    </div>
  );
}
