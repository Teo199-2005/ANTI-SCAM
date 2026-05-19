"use client";

import DashCard from "@/components/dash/DashCard";
import StatCard from "@/components/dashboard/StatCard";
import {
  getAdminBookingCommissionAnalytics,
  type AdminBookingCommissionAnalytics,
} from "@/lib/api/admin";
import { formatPhp } from "@/lib/formatPhp";
import { Banknote, RefreshCw, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  year: number;
};

export function AdminAnalyticsMarketingTab({ year }: Props) {
  const [data, setData] = useState<AdminBookingCommissionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminBookingCommissionAnalytics(year));
    } catch {
      setError("Could not load marketing partner analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxMonthlyNet = useMemo(
    () => Math.max(1, ...(data?.monthly.map((m) => m.net_credited_php) ?? [1])),
    [data],
  );

  if (loading && !data) {
    return <div className="dash-card p-8 text-center text-zinc-500">Loading marketing analytics…</div>;
  }

  if (error) {
    return <div className="dash-alert-error">{error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600">
          Partner booking commissions for <strong className="text-navy">{year}</strong> — flat rate per paid online
          guest booking at assigned resorts.
        </p>
        <button type="button" className="dash-btn-sm" onClick={() => void load()}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <DashCard className="p-4 text-sm text-zinc-700">{data.policy_note}</DashCard>

      <div className="rounded-2xl border border-softBorderStrong/70 bg-softGray/20 p-2 sm:p-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatCard
            compact
            label="Current rate"
            value={formatPhp(data.current_rate_php)}
            subtitle={data.commissions_enabled ? "Enabled" : "Disabled"}
            icon={Banknote}
            iconTone="violet"
          />
          <StatCard
            compact
            label="Booking credits"
            value={String(data.totals.credits_count)}
            subtitle={formatPhp(data.totals.credits_gross_php)}
            icon={TrendingUp}
            iconTone="emerald"
          />
          <StatCard
            compact
            label="Reversals"
            value={String(data.totals.reversals_count)}
            subtitle={formatPhp(data.totals.reversals_gross_php)}
            icon={TrendingDown}
            iconTone="amber"
          />
          <StatCard
            compact
            label="Net credited (YTD)"
            value={formatPhp(data.totals.net_credited_php)}
            subtitle={`${data.totals.marketers_active} active partners`}
            icon={Users}
            iconTone="navy"
          />
        </div>
      </div>

      <DashCard className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-navy">Monthly net credited</h2>
        <p className="mb-4 text-xs text-zinc-400">Credits minus reversals per calendar month</p>
        <div className="flex items-end justify-between gap-1">
          {data.monthly.map((m) => {
            const h = Math.max(6, Math.round((m.net_credited_php / maxMonthlyNet) * 100));
            return (
              <div key={m.period} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-28 w-full items-end justify-center">
                  <div
                    className="w-full max-w-[28px] rounded-t-md bg-emerald-500"
                    style={{ height: `${h}%` }}
                    title={`${m.credits_count} credits · ${formatPhp(m.net_credited_php)} net`}
                  />
                </div>
                <span className="text-[9px] font-semibold text-zinc-500">{m.period.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </DashCard>

      <DashCard className="overflow-hidden p-0">
        <div className="border-b border-softBorder px-6 py-4">
          <h2 className="text-sm font-semibold text-navy">Top marketing partners (by credits)</h2>
        </div>
        {data.top_marketers.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No booking credits recorded for this year.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Email</th>
                  <th>Credits</th>
                  <th>Gross PHP</th>
                </tr>
              </thead>
              <tbody>
                {data.top_marketers.map((m) => (
                  <tr key={m.marketer_id}>
                    <td className="font-semibold text-navy">{m.marketer_name}</td>
                    <td className="text-zinc-600">{m.marketer_email}</td>
                    <td>{m.credits_count}</td>
                    <td className="text-emerald-700">{formatPhp(m.credits_gross_php)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>

      <DashCard className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-navy">Commission ledger snapshot</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="dash-inset p-3">
            <p className="text-[10px] font-bold uppercase text-zinc-500">Booking pending</p>
            <p className="text-lg font-bold text-violet-800">
              {formatPhp(data.commission_ledger.booking_pending_gross_php)}
            </p>
          </div>
          <div className="dash-inset p-3">
            <p className="text-[10px] font-bold uppercase text-zinc-500">Booking released</p>
            <p className="text-lg font-bold text-emerald-700">
              {formatPhp(data.commission_ledger.booking_released_gross_php)}
            </p>
          </div>
          <div className="dash-inset p-3">
            <p className="text-[10px] font-bold uppercase text-zinc-500">Legacy pending</p>
            <p className="text-lg font-bold text-zinc-700">
              {formatPhp(data.commission_ledger.legacy_pending_gross_php)}
            </p>
          </div>
          <div className="dash-inset p-3">
            <p className="text-[10px] font-bold uppercase text-zinc-500">Legacy released</p>
            <p className="text-lg font-bold text-zinc-600">
              {formatPhp(data.commission_ledger.legacy_released_gross_php)}
            </p>
          </div>
        </div>
      </DashCard>
    </div>
  );
}
