"use client";

import DashCard from "@/components/dash/DashCard";
import {
  type AnalyticsFilters,
  type AdminAnalytics,
  getAdminAnalytics,
} from "@/lib/api/admin";
import { exportAdminAnalyticsPdf } from "@/lib/pdf/exportAdminAnalyticsPdf";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Download,
  Filter,
  Loader2,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhp } from "@/lib/formatPhp";
import { useCallback, useEffect, useMemo, useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const STATUS_COLORS: Record<string, string> = {
  confirmed:       "bg-emerald-500",
  pending_payment: "bg-amber-400",
  cancelled:       "bg-rose-500",
  pending:         "bg-sky-400",
  checked_in:      "bg-violet-500",
  checked_out:     "bg-zinc-400",
};

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.max(4, Math.round((value / total) * 100));
}

function StatBadge({
  label,
  value,
  sub,
  color = "text-navy",
  icon,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <DashCard
      className={cn(
        "border-softBorderStrong/75 p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">{label}</p>
        {icon && <span className="shrink-0 opacity-60">{icon}</span>}
      </div>
      <p className={cn("mt-1.5 break-words text-2xl font-bold sm:mt-2 sm:text-3xl", color)}>{value}</p>
      {sub && <p className="mt-1 text-[10px] leading-snug text-zinc-400 sm:text-xs">{sub}</p>}
    </DashCard>
  );
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [data, setData]     = useState<AdminAnalytics | null>(null);

  // Filter state
  const [filters, setFilters] = useState<AnalyticsFilters>({
    year: CURRENT_YEAR,
    resort_id: "",
    month: "",
    min_revenue: "",
    max_revenue: "",
  });
  const [applied, setApplied] = useState<AnalyticsFilters>({ year: CURRENT_YEAR });

  const load = useCallback(async (f: AnalyticsFilters) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAdminAnalytics(f);
      setData(payload);
    } catch {
      setError("Failed to load analytics. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(applied); }, [applied, load]);

  const applyFilters = () => setApplied({ ...filters });
  const resetFilters = () => {
    const def: AnalyticsFilters = { year: CURRENT_YEAR, resort_id: "", month: "", min_revenue: "", max_revenue: "" };
    setFilters(def);
    setApplied({ year: CURRENT_YEAR });
  };

  // Derived safe arrays
  const daily   = useMemo(() => Array.isArray(data?.daily)   ? data!.daily   : [], [data]);
  const monthly = useMemo(() => Array.isArray(data?.monthly) ? data!.monthly : [], [data]);
  const topRev  = useMemo(() => Array.isArray(data?.topResortsByRevenue) ? data!.topResortsByRevenue : [], [data]);
  const topCnt  = useMemo(() => Array.isArray(data?.topResortsByCount)   ? data!.topResortsByCount   : [], [data]);
  const resorts = useMemo(() => Array.isArray(data?.resorts) ? data!.resorts : [], [data]);

  const maxMonthlyRev  = useMemo(() => Math.max(...monthly.map(m => m.revenue), 1), [monthly]);
  const maxMonthlyBook = useMemo(() => Math.max(...monthly.map(m => m.reservationsCount), 1), [monthly]);
  const maxDailyBook   = useMemo(() => Math.max(...daily.map(d => d.reservationsCount), 1), [daily]);
  const maxTopRev      = useMemo(() => Math.max(...topRev.map(r => r.revenue), 1), [topRev]);
  const maxTopCnt      = useMemo(() => Math.max(...topCnt.map(r => r.count), 1), [topCnt]);

  const summary = data?.summary;

  const isFiltered = !!(applied.resort_id || applied.month || applied.min_revenue || applied.max_revenue);

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="dash-page-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="dash-page-title flex items-center gap-2">
            <BarChart3 size={24} className="text-skyBlue" />
            Analytics
          </h1>
          <p className="dash-page-sub max-w-3xl">
            Platform-wide monitoring — filter by resort, period, or revenue range. All charts update live when you apply filters.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!data) return;
            setExportingPdf(true);
            void exportAdminAnalyticsPdf(data, applied)
              .catch(() => {
                /* toast could be added; export throws on empty PDF */
              })
              .finally(() => setExportingPdf(false));
          }}
          disabled={loading || exportingPdf || !data}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-softBorder bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export PDF
        </button>
      </div>

      {/* ── Filter bar ── */}
      <DashCard className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Filter size={15} className="text-skyBlue" />
          <span className="text-sm font-semibold text-navy">Filters</span>
          {isFiltered && (
            <span className="rounded-full bg-skyBlue px-2 py-0.5 text-[10px] font-bold text-white">Active</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {/* Resort */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Resort</label>
            <select
              className="dash-input w-full"
              value={filters.resort_id ?? ""}
              onChange={e => setFilters(f => ({ ...f, resort_id: e.target.value ? Number(e.target.value) : "" }))}
            >
              <option value="">All Resorts</option>
              {resorts.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Year</label>
            <select
              className="dash-input w-full"
              value={filters.year ?? CURRENT_YEAR}
              onChange={e => setFilters(f => ({ ...f, year: Number(e.target.value) }))}
            >
              {YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Month</label>
            <select
              className="dash-input w-full"
              value={filters.month ?? ""}
              onChange={e => setFilters(f => ({ ...f, month: e.target.value ? Number(e.target.value) : "" }))}
            >
              <option value="">All Months</option>
              {MONTHS.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>

          {/* Min Revenue */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Min revenue</label>
            <input
              type="number"
              min={0}
              className="dash-input w-full"
              placeholder="e.g. 500"
              value={filters.min_revenue ?? ""}
              onChange={e => setFilters(f => ({ ...f, min_revenue: e.target.value ? Number(e.target.value) : "" }))}
            />
          </div>

          {/* Max Revenue */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Max revenue</label>
            <input
              type="number"
              min={0}
              className="dash-input w-full"
              placeholder="e.g. 5000"
              value={filters.max_revenue ?? ""}
              onChange={e => setFilters(f => ({ ...f, max_revenue: e.target.value ? Number(e.target.value) : "" }))}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={applyFilters}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a2c53] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SlidersHorizontal size={14} />
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-softBorder bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          {isFiltered && (
            <span className="self-center text-xs text-zinc-400">
              Showing results for {applied.resort_id ? `Resort #${applied.resort_id}` : "all resorts"} ·{" "}
              {applied.month ? MONTHS[(applied.month as number) - 1] : "all months"} · {applied.year}
              {applied.min_revenue ? ` · min ${formatPhp(Number(applied.min_revenue))}` : ""}
              {applied.max_revenue ? ` · max ${formatPhp(Number(applied.max_revenue))}` : ""}
            </span>
          )}
        </div>
      </DashCard>

      {/* ── Error / loading ── */}
      {error && (
        <div className="dash-card border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</div>
      )}
      {loading && (
        <div className="dash-card p-8 text-center text-zinc-500">Loading analytics…</div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── KPI Cards (2×2 phone → row on xl) ── */}
          <div className="rounded-2xl border border-softBorderStrong/70 bg-softGray/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <StatBadge
              label="Total Revenue"
              value={formatPhp(Number(summary?.totalRevenue ?? 0))}
              sub="Confirmed reservations only"
              color="text-emerald-700"
              icon={<DollarSign size={18} className="text-emerald-500" />}
            />
            <StatBadge
              label="Avg. Reservation Value"
              value={formatPhp(Number(summary?.avgValue ?? 0))}
              sub="Per confirmed booking"
              color="text-skyBlue"
              icon={<TrendingUp size={18} className="text-skyBlue" />}
            />
            <StatBadge
              label="Total Bookings"
              value={summary?.totalCount ?? 0}
              sub={`${summary?.confirmedCount ?? 0} confirmed · ${summary?.pendingCount ?? 0} pending`}
              color="text-navy"
              icon={<CalendarDays size={18} className="text-navy" />}
            />
            <StatBadge
              label="Confirmation Rate"
              value={`${summary?.confirmationRate ?? 0}%`}
              sub={`Cancellation: ${summary?.cancellationRate ?? 0}%`}
              color={(summary?.confirmationRate ?? 0) >= 70 ? "text-emerald-700" : "text-amber-600"}
              icon={<CheckCircle2 size={18} className="text-emerald-500" />}
            />
            </div>
          </div>

          {/* ── Rate indicators (2×2 phone → row on xl) ── */}
          <div className="rounded-2xl border border-softBorderStrong/70 bg-softGray/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <DashCard className="border-softBorderStrong/75 p-3 shadow-sm sm:p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                <span className="text-[11px] font-medium leading-tight text-zinc-600 sm:text-xs">Confirmed</span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-emerald-700 sm:mt-2 sm:text-2xl">{summary?.confirmedCount ?? 0}</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-softGray">
                <div className="h-1.5 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct(summary?.confirmedCount ?? 0, summary?.totalCount ?? 0)}%` }} />
              </div>
            </DashCard>
            <DashCard className="border-softBorderStrong/75 p-3 shadow-sm sm:p-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="shrink-0 text-amber-500" />
                <span className="text-[11px] font-medium leading-tight text-zinc-600 sm:text-xs">Pending Payment</span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-amber-600 sm:mt-2 sm:text-2xl">{summary?.pendingCount ?? 0}</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-softGray">
                <div className="h-1.5 rounded-full bg-amber-400 transition-all"
                  style={{ width: `${pct(summary?.pendingCount ?? 0, summary?.totalCount ?? 0)}%` }} />
              </div>
            </DashCard>
            <DashCard className="border-softBorderStrong/75 p-3 shadow-sm sm:p-4">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="shrink-0 text-rose-500" />
                <span className="text-[11px] font-medium leading-tight text-zinc-600 sm:text-xs">Cancelled</span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-rose-600 sm:mt-2 sm:text-2xl">{summary?.cancelledCount ?? 0}</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-softGray">
                <div className="h-1.5 rounded-full bg-rose-500 transition-all"
                  style={{ width: `${pct(summary?.cancelledCount ?? 0, summary?.totalCount ?? 0)}%` }} />
              </div>
            </DashCard>
            <DashCard className="border-softBorderStrong/75 p-3 shadow-sm sm:p-4">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="shrink-0 text-rose-400" />
                <span className="text-[11px] font-medium leading-tight text-zinc-600 sm:text-xs">Cancellation Rate</span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-rose-500 sm:mt-2 sm:text-2xl">{summary?.cancellationRate ?? 0}%</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-softGray">
                <div className="h-1.5 rounded-full bg-rose-400 transition-all"
                  style={{ width: `${summary?.cancellationRate ?? 0}%` }} />
              </div>
            </DashCard>
            </div>
          </div>

          {/* ── Monthly chart (clean dual-bar style) ── */}
          <DashCard className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-navy">
              Monthly Overview — {applied.year}
              {applied.month ? ` (${MONTHS[(applied.month as number) - 1]} only)` : ""}
            </h2>
            <p className="mb-4 text-xs text-zinc-400">Revenue and bookings per month</p>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-zinc-400">
                {MONTHS.map((month) => (
                  <span key={month} className="text-center">{month.slice(0, 3)}</span>
                ))}
              </div>
              <div className="grid grid-cols-12 gap-2 rounded-2xl border border-softBorder bg-softCard p-3">
              {monthly.map((m) => {
                const revH  = Math.max(8, Math.round((m.revenue / maxMonthlyRev) * 100));
                const bookH = Math.max(8, Math.round((m.reservationsCount / maxMonthlyBook) * 100));
                const isActive = applied.month === m.month;
                return (
                  <div key={m.month} className="group relative flex min-h-[180px] flex-col justify-end">
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-36 -translate-x-1/2 rounded-xl border border-softBorder bg-white p-2 text-xs shadow-lg group-hover:block">
                      <p className="font-semibold text-navy">{MONTHS[m.month - 1]}</p>
                      <p className="text-emerald-700">{formatPhp(m.revenue)}</p>
                      <p className="text-zinc-500">{m.reservationsCount} bookings</p>
                      {m.cancelledCount > 0 && <p className="text-rose-500">{m.cancelledCount} cancelled</p>}
                    </div>
                    <div className="flex h-full items-end justify-center gap-1.5">
                      {/* Revenue bar */}
                      <div
                        className={`w-2.5 rounded-t-md transition-all ${isActive ? "bg-navy" : "bg-emerald-500"} opacity-95`}
                        style={{ height: `${revH}%` }}
                      />
                      {/* Bookings bar */}
                      <div
                        className={`w-2.5 rounded-t-md transition-all ${isActive ? "bg-skyBlue" : "bg-sky-300"} opacity-95`}
                        style={{ height: `${bookH}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Revenue</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-skyBlue" /> Bookings</span>
            </div>
          </DashCard>

          {/* ── Status breakdown + Daily trend ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <DashCard className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-navy">Reservation Status Breakdown</h2>
              {Object.keys(data.statusBreakdown).length === 0 ? (
                <p className="text-xs text-zinc-400">No reservation data for this period.</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(data.statusBreakdown).map(([status, count]) => {
                    const barW = pct(count, summary?.totalCount ?? 0);
                    return (
                      <div key={status}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 capitalize text-zinc-700">
                            <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status] ?? "bg-zinc-400"}`} />
                            {status.replaceAll("_", " ")}
                          </span>
                          <span className="font-semibold text-navy">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-softGray">
                          <div
                            className={`h-2 rounded-full ${STATUS_COLORS[status] ?? "bg-zinc-400"} transition-all`}
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </DashCard>

            <DashCard className="p-5">
              <h2 className="mb-1 text-sm font-semibold text-navy">
                Daily Reservations {applied.month ? `(${MONTHS[(applied.month as number) - 1]})` : "(last 30 days)"}
              </h2>
              <p className="mb-3 text-xs text-zinc-400">Each bar = one day. Hover for details.</p>
              {daily.length === 0 ? (
                <p className="text-xs text-zinc-400">No daily data for this period.</p>
              ) : (
                <div className="space-y-2">
                  {daily.slice(-14).map((d) => {
                    const w = Math.max(4, Math.round((d.reservationsCount / maxDailyBook) * 100));
                    return (
                      <div key={d.day}>
                        <div className="mb-0.5 flex items-center justify-between text-xs text-zinc-500">
                          <span>{d.day}</span>
                          <span>{d.reservationsCount} · {formatPhp(d.revenue)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-softGray">
                          <div className="h-2 rounded-full bg-skyBlue transition-all" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </DashCard>
          </div>

          {/* ── Top resorts tables ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top by revenue */}
            <DashCard className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <DollarSign size={15} className="text-emerald-600" />
                <h2 className="text-sm font-semibold text-navy">Top Resorts by Revenue</h2>
              </div>
              {topRev.length === 0 ? (
                <p className="text-xs text-zinc-400">No confirmed reservations in this period.</p>
              ) : (
                <div className="space-y-3">
                  {topRev.map((r, i) => {
                    const w = Math.max(6, Math.round((r.revenue / maxTopRev) * 100));
                    return (
                      <div key={r.resort_id}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-medium text-zinc-700">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                              {i + 1}
                            </span>
                            <Building2 size={12} className="text-zinc-400" />
                            {r.name}
                          </span>
                          <span className="font-semibold text-emerald-700">{formatPhp(r.revenue)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-softGray">
                          <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${w}%` }} />
                        </div>
                        <p className="mt-0.5 text-right text-[10px] text-zinc-400">{r.count} confirmed bookings</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </DashCard>

            {/* Top by booking count */}
            <DashCard className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays size={15} className="text-skyBlue" />
                <h2 className="text-sm font-semibold text-navy">Top Resorts by Bookings</h2>
              </div>
              {topCnt.length === 0 ? (
                <p className="text-xs text-zinc-400">No bookings in this period.</p>
              ) : (
                <div className="space-y-3">
                  {topCnt.map((r, i) => {
                    const w = Math.max(6, Math.round((r.count / maxTopCnt) * 100));
                    return (
                      <div key={r.resort_id}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-medium text-zinc-700">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-skyBlue">
                              {i + 1}
                            </span>
                            <Building2 size={12} className="text-zinc-400" />
                            {r.name}
                          </span>
                          <span className="font-semibold text-navy">{r.count} bookings</span>
                        </div>
                        <div className="h-2 rounded-full bg-softGray">
                          <div className="h-2 rounded-full bg-skyBlue transition-all" style={{ width: `${w}%` }} />
                        </div>
                        <p className="mt-0.5 text-right text-[10px] text-zinc-400">{formatPhp(r.confirmedRevenue)} confirmed revenue</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </DashCard>
          </div>

          {/* ── Admin quick links ── */}
          <DashCard className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-navy">Admin Control Scope</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="dash-inset p-3 text-sm text-zinc-700">
                <ShieldCheck size={14} className="mb-1 text-emerald-600" /> Full user management
              </div>
              <div className="dash-inset p-3 text-sm text-zinc-700">
                <CalendarDays size={14} className="mb-1 text-skyBlue" /> Full reservation oversight
              </div>
              <div className="dash-inset p-3 text-sm text-zinc-700">
                <DollarSign size={14} className="mb-1 text-amber-600" /> Billing and payments monitoring
              </div>
              <div className="dash-inset p-3 text-sm text-zinc-700">
                <Activity size={14} className="mb-1 text-violet-600" /> Audit logs and system settings
              </div>
            </div>
          </DashCard>
        </>
      )}
    </div>
  );
}
