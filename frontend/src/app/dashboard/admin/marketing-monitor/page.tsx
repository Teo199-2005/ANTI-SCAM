"use client";

import DashCard from "@/components/dash/DashCard";
import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import DataTable from "@/components/shared/DataTable";
import SortableTh from "@/components/shared/SortableTh";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import MarketerTierBadge, { marketerTierSortRank } from "@/components/dashboard/MarketerTierBadge";
import {
  getAdminMarketersMonitoring,
  type AdminMarketerMonitorRow,
  type AdminMarketerMonitoringPayload,
} from "@/lib/api/admin";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { compareNullable, nextSort, paginateLocal, type SortDir } from "@/lib/tableSortPagination";
import { Activity, Info, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const SORT_FIRST: Record<string, SortDir> = {
  name: "asc",
  assigned_resorts_count: "desc",
  referred_clients_count: "desc",
  referred_resorts_count: "desc",
  months_since_last_new_referred_resort: "desc",
  joined_at: "desc",
  last_any_referral_payment_at: "desc",
  total_referred_subscription_php: "desc",
  commission_pending_php: "desc",
  commission_released_gross_php: "desc",
  commission_total_gross_php: "desc",
  marketer_tier_key: "desc",
  per_payment_php: "desc",
};

function fmtPhp(n: number | null | undefined) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return "PHP 0.00";
  return `PHP ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
    return <span className="dash-badge-rose">No conversions yet</span>;
  }
  if (months === null) return <span className="dash-badge-slate">—</span>;
  if (months >= 6) return <span className="dash-badge-rose">{months} mo idle</span>;
  if (months >= 3) return <span className="dash-badge-amber">{months} mo idle</span>;
  return <span className="dash-badge-emerald">{months} mo idle</span>;
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

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAdminMarketersMonitoring(search || undefined);
      setRows(payload.rows);
      setMeta(payload.meta);
    } catch (err) {
      setRows([]);
      setMeta(null);
      setError(parseApiErrorMessage(err, "Failed to load marketing partners."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("");
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied(query);
    setPage(1);
    void load(query);
  };

  const tierCounts = useMemo(() => {
    let silver = 0;
    let gold = 0;
    let platinum = 0;
    let other = 0;
    let none = 0;
    for (const r of rows) {
      const k = r.marketer_tier_key;
      if (k === "silver") silver++;
      else if (k === "gold") gold++;
      else if (k === "platinum") platinum++;
      else if (k === "emergency_flat") other++;
      else none++;
    }
    return { silver, gold, platinum, other, none };
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
        case "total_referred_subscription_php":
          return compareNullable(a.total_referred_subscription_php, b.total_referred_subscription_php, sortDir);
        case "commission_pending_php":
          return compareNullable(a.commission_pending_php, b.commission_pending_php, sortDir);
        case "commission_released_gross_php":
          return compareNullable(a.commission_released_gross_php, b.commission_released_gross_php, sortDir);
        case "commission_total_gross_php":
          return compareNullable(a.commission_total_gross_php, b.commission_total_gross_php, sortDir);
        case "marketer_tier_key":
          return compareNullable(marketerTierSortRank(a.marketer_tier_key), marketerTierSortRank(b.marketer_tier_key), sortDir);
        case "per_payment_php":
          return compareNullable(
            a.per_payment_php ?? -1,
            b.per_payment_php ?? -1,
            sortDir,
          );
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

  const colSpan = 11;

  return (
    <div className="space-y-6">
      <div className="dash-page-header">
        <h1 className="dash-page-title flex items-center gap-2">
          <Activity size={24} className="text-skyBlue" />
          Marketing monitor
        </h1>
        <p className="dash-page-sub">
          Referral conversions, partner tier (by converting clients — one owner org per client), idle time since the last
          new client, paid subscription volume, and commission balances. Tiers set the PHP credited per qualifying paid
          subscription invoice. Sorted with the longest idle periods first.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={onSearch} className="dash-filter-bar flex-1">
            <div className="relative min-w-[200px] flex-1">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                className="dash-input pl-9"
                placeholder="Search name, email, or referral code…"
                value={query}
                onChange={(e) => setQuery(sanitizeSearchQuery(e.target.value))}
              />
            </div>
            <button type="submit" className="dash-btn-primary shrink-0">
              Search
            </button>
          </form>
          <button
            type="button"
            onClick={() => void load(applied)}
            className="dash-btn-neutral-strong inline-flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/95 via-white to-fuchsia-50/80 px-4 py-3 text-xs text-violet-950 shadow-sm">
          <span className="font-bold uppercase tracking-wide text-violet-900/80">Tier snapshot</span>
          <MarketerTierBadge tierKey="platinum" label={`Platinum ${tierCounts.platinum}`} size="sm" />
          <MarketerTierBadge tierKey="gold" label={`Gold ${tierCounts.gold}`} size="sm" />
          <MarketerTierBadge tierKey="silver" label={`Silver ${tierCounts.silver}`} size="sm" />
          {tierCounts.other > 0 ? (
            <MarketerTierBadge tierKey="emergency_flat" label={`Flat rate ${tierCounts.other}`} size="sm" />
          ) : null}
          {tierCounts.none > 0 ? (
            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
              No tier {tierCounts.none}
            </span>
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

      {meta?.tier_ladder && meta.tier_ladder.length > 0 ? (
        <div className="rounded-2xl border border-softBorder bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Commission tier ladder</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {meta.tier_ladder.map((t) => (
              <div
                key={t.tier_key}
                className="inline-flex items-center gap-2 rounded-xl border border-softBorder bg-softCard/80 px-3 py-2 text-xs"
              >
                <MarketerTierBadge tierKey={t.tier_key} label={t.label} size="sm" />
                <span className="tabular-nums text-zinc-600">{t.client_range_label} resorts</span>
                <span className="font-semibold tabular-nums text-navy">₱{Number(t.per_payment_php).toLocaleString()}</span>
              </div>
            ))}
          </div>
          {meta.tier_policy ? <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">{meta.tier_policy}</p> : null}
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
                  title={r.name}
                  fields={[
                    { label: "Email", value: <span className="break-all">{r.email}</span> },
                    {
                      label: "Referral code",
                      value: <span className="font-mono text-violet-800">{r.referral_code ?? "—"}</span>,
                    },
                    {
                      label: "Assigned / clients / resorts billed",
                      value: (
                        <span>
                          {r.assigned_resorts_count} assigned · <strong>{r.referred_clients_count}</strong> clients ·{" "}
                          <strong>{r.referred_resorts_count}</strong> resorts
                        </span>
                      ),
                    },
                    {
                      label: "Tier / per paid credit",
                      value: (
                        <div className="space-y-1">
                          <MarketerTierBadge tierKey={r.marketer_tier_key} label={r.marketer_tier_label} size="sm" />
                          {r.per_payment_php != null ? (
                            <div className="text-[11px] font-semibold text-navy tabular-nums">
                              ₱{Number(r.per_payment_php).toLocaleString()} / credit
                            </div>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      label: "Idle (since new client)",
                      value: (
                        <div className="space-y-1">
                          <IdleBadge
                            months={r.months_since_last_new_referred_resort}
                            referredCount={r.referred_clients_count}
                          />
                          <div className="text-[11px] text-zinc-500">
                            Last new client: {fmtDate(r.last_new_referred_resort_at)}
                          </div>
                        </div>
                      ),
                    },
                    {
                      label: "Last referral payment",
                      value: fmtDate(r.last_any_referral_payment_at),
                    },
                    {
                      label: "Paid subscription volume (attrib.)",
                      value: fmtPhp(r.total_referred_subscription_php),
                    },
                    {
                      label: "Commission pending / released / total",
                      value: (
                        <span>
                          {fmtPhp(r.commission_pending_php)} / {fmtPhp(r.commission_released_gross_php)} /{" "}
                          <strong>{fmtPhp(r.commission_total_gross_php)}</strong>
                        </span>
                      ),
                    },
                  ]}
                />
              ))}
            </div>
          )}
          {paginationFooter ? <div className="border-t border-softBorder px-2 py-1">{paginationFooter}</div> : null}
        </div>

        <div className="hidden md:block">
          <DataTable
            minWidthClass="min-w-[1260px]"
            caption={undefined}
            footer={paginationFooter ?? undefined}
            headers={
              <>
                <SortableTh label="Marketer" sortKey="name" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                <SortableTh
                  label="Assigned"
                  sortKey="assigned_resorts_count"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="center"
                  className="text-center"
                />
                <SortableTh
                  label="Clients"
                  sortKey="referred_clients_count"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="center"
                  className="text-center"
                />
                <SortableTh
                  label="Resorts billed"
                  sortKey="referred_resorts_count"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="center"
                  className="text-center"
                />
                <SortableTh
                  label="Tier"
                  sortKey="marketer_tier_key"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="Idle (new client)"
                  sortKey="months_since_last_new_referred_resort"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="Last referral payment"
                  sortKey="last_any_referral_payment_at"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="Sub volume"
                  sortKey="total_referred_subscription_php"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="right"
                  className="text-right"
                />
                <SortableTh
                  label="Pending"
                  sortKey="commission_pending_php"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="right"
                  className="text-right"
                />
                <SortableTh
                  label="Released"
                  sortKey="commission_released_gross_php"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="right"
                  className="text-right"
                />
                <SortableTh
                  label="Total comm."
                  sortKey="commission_total_gross_php"
                  activeKey={sortBy}
                  direction={sortDir}
                  onSort={onSort}
                  align="right"
                  className="text-right"
                />
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
                  <td>
                    <div className="font-semibold text-navy">{r.name}</div>
                    <div className="text-xs text-zinc-500">{r.email}</div>
                    {r.referral_code ? (
                      <div className="mt-0.5 font-mono text-[11px] text-violet-700">Code: {r.referral_code}</div>
                    ) : null}
                  </td>
                  <td className="text-center tabular-nums">{r.assigned_resorts_count}</td>
                  <td className="text-center tabular-nums font-semibold text-navy">{r.referred_clients_count}</td>
                  <td className="text-center tabular-nums font-medium">{r.referred_resorts_count}</td>
                  <td>
                    <div className="space-y-1">
                      <MarketerTierBadge tierKey={r.marketer_tier_key} label={r.marketer_tier_label} size="sm" />
                      {r.per_payment_php != null ? (
                        <div className="text-[11px] font-medium tabular-nums text-navy">
                          ₱{Number(r.per_payment_php).toLocaleString()} / credit
                        </div>
                      ) : null}
                      {r.clients_to_next_tier != null && r.next_tier_at != null && r.clients_to_next_tier > 0 ? (
                        <div className="text-[10px] text-zinc-500">
                          +{r.clients_to_next_tier} to tier threshold {r.next_tier_at}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <IdleBadge
                      months={r.months_since_last_new_referred_resort}
                      referredCount={r.referred_clients_count}
                    />
                    <div className="mt-1 text-[11px] text-zinc-500">
                      Last new: {fmtDate(r.last_new_referred_resort_at)}
                    </div>
                  </td>
                  <td className="text-sm text-zinc-700">{fmtDate(r.last_any_referral_payment_at)}</td>
                  <td className="text-right tabular-nums">{fmtPhp(r.total_referred_subscription_php)}</td>
                  <td className="text-right tabular-nums">{fmtPhp(r.commission_pending_php)}</td>
                  <td className="text-right tabular-nums">{fmtPhp(r.commission_released_gross_php)}</td>
                  <td className="text-right tabular-nums font-medium">{fmtPhp(r.commission_total_gross_php)}</td>
                </tr>
              ))}
            </AsyncStatePanel>
          </DataTable>
        </div>
      </DashCard>
    </div>
  );
}
