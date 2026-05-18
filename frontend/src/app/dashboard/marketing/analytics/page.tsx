"use client";

import DashCard from "@/components/dash/DashCard";
import StatCard from "@/components/dashboard/StatCard";
import {
  getMarketingAnalytics,
  type MarketingAnalyticsPayload,
  type MarketingMonthlyAnalytics,
} from "@/lib/api/marketing";
import { exportMarketingAnalyticsPdf } from "@/lib/pdf/exportMarketingAnalyticsPdf";
import { BarChart3, Building2, DollarSign, Download, Loader2, PieChart, TrendingUp, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPhpLedger as fmtMoney } from "@/lib/formatPhp";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

function monthLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString("en-PH", { month: "short" });
}

export default function MarketingAnalyticsPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState<MarketingAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getMarketingAnalytics(y);
      setData(payload);
    } catch {
      setError("Could not load analytics. Ensure you are signed in as marketing.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year);
  }, [year, load]);

  const maxCommissionMonth = useMemo(() => {
    if (!data?.monthly?.length) return 1;
    return Math.max(
      1,
      ...data.monthly.map((m: MarketingMonthlyAnalytics) => m.commission_pending + m.commission_released),
    );
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="dash-hero-banner-staff">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-dash text-dash-xs font-medium text-white/70">Insights</p>
            <h1 className="mt-1 font-dash text-dash-3xl font-bold text-white md:text-dash-4xl">Marketing analytics</h1>
            <p className="mt-1 max-w-xl font-dash text-dash-sm text-white/80">
              Referral-driven subscription payments and commission accruals for your assigned resorts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="marketing-analytics-year" className="sr-only">
              Year
            </label>
            <select
              id="marketing-analytics-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="dash-input max-w-[10rem] bg-white/95 font-dash text-dash-sm text-navy"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (!data) return;
                setExportingPdf(true);
                try {
                  exportMarketingAnalyticsPdf(data, year);
                } finally {
                  setExportingPdf(false);
                }
              }}
              disabled={loading || exportingPdf || !data}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/95 px-4 py-2 font-dash text-dash-sm font-semibold text-navy shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="dash-alert-error">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-softBorderStrong/70 bg-softGray/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4">
          <StatCard
            compact
            label="Pending commission (YTD)"
            value={data ? fmtMoney(data.totals.commission_pending_ytd) : "–"}
            icon={PieChart}
            iconTone="amber"
          />
          <StatCard
            compact
            label="Released commission (YTD)"
            value={data ? fmtMoney(data.totals.commission_released_ytd) : "–"}
            icon={DollarSign}
            iconTone="emerald"
          />
          <StatCard
            compact
            label="Referral checkouts"
            value={data ? String(data.totals.referral_subscription_count_ytd) : "–"}
            icon={Users}
            iconTone="navy"
          />
          <StatCard
            compact
            label="Referral volume (YTD)"
            value={data ? fmtMoney(data.totals.referral_subscription_volume_ytd) : "–"}
            icon={TrendingUp}
            iconTone="violet"
          />
        </div>
      </div>

      <DashCard className="overflow-hidden p-0">
        <div className="border-b border-softBorder px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-sky-100 p-2">
              <BarChart3 size={16} className="text-sky-700" />
            </div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">Monthly activity</h2>
              <p className="text-xs text-zinc-400">
                Stacked commissions (pending · released) and referral-backed subscription payments per month.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-amber-400" /> Pending
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Released
            </span>
          </div>
        </div>
        <div className="p-4 md:p-6">
          {loading && !data ? (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-500">Loading…</div>
          ) : (
            <div className="flex items-end justify-between gap-1 md:gap-2">
              {(data?.monthly ?? []).map((m) => {
                const total = m.commission_pending + m.commission_released;
                const barPct = Math.max(2, Math.round((total / maxCommissionMonth) * 100));
                const pendingFlex = total > 0 ? m.commission_pending : 0;
                const releasedFlex = total > 0 ? m.commission_released : 0;
                return (
                  <div key={m.period} className="mx-auto flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div className="flex h-36 w-full max-w-[52px] flex-col justify-end rounded-lg bg-softGray/80">
                      {total > 0 ? (
                        <div
                          className="flex w-full flex-col-reverse overflow-hidden rounded-md"
                          style={{ height: `${barPct}%` }}
                          title={`Pending ${fmtMoney(m.commission_pending)} · Released ${fmtMoney(m.commission_released)}`}
                        >
                          {pendingFlex > 0 ? (
                            <div className="min-h-[2px] w-full bg-amber-400" style={{ flex: pendingFlex }} />
                          ) : null}
                          {releasedFlex > 0 ? (
                            <div className="min-h-[2px] w-full bg-emerald-500" style={{ flex: releasedFlex }} />
                          ) : null}
                        </div>
                      ) : (
                        <div className="h-1 w-full rounded bg-zinc-200/80" />
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-500">{monthLabel(m.period)}</span>
                    <span className="text-[9px] text-zinc-400">{m.referral_payment_count} ref.</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashCard>

      <DashCard className="overflow-hidden p-0">
        <div className="border-b border-softBorder px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-softGray p-2">
              <Building2 size={16} className="text-slateBlue" />
            </div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">By assigned resort</h2>
              <p className="text-xs text-zinc-400">Commission totals credited for {year}</p>
            </div>
          </div>
        </div>
        {!data?.by_resort?.length ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No commission rows for this year yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Resort</th>
                  <th>Total</th>
                  <th>Pending</th>
                  <th>Released</th>
                </tr>
              </thead>
              <tbody>
                {data.by_resort.map((r) => (
                  <tr key={r.resort_id}>
                    <td className="font-semibold text-navy">{r.resort_name}</td>
                    <td>{fmtMoney(r.commission_total)}</td>
                    <td>{fmtMoney(r.commission_pending)}</td>
                    <td className="text-emerald-700">{fmtMoney(r.commission_released)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>
    </div>
  );
}
