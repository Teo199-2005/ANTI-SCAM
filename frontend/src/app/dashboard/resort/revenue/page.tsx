"use client";

import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard from "@/components/shared/DashMobileTableCard";
import { getResortStats } from "@/lib/api/dashboard";
import { apiClient } from "@/lib/api/client";
import { color, rgb, shadowKpiTint } from "@/lib/design-tokens";
import { BadgeDollarSign, CalendarCheck2, Loader2, ReceiptText, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

type MonthlyBreakdown = {
  month: string;
  year: number;
  reservations: number;
  confirmed: number;
  grossBookings: number;
  feesCollected: number;
};

type ApiEnvelope<T> = { success: boolean; data: T };

export default function ResortRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    totalReservationFees: 0,
    totalGrossBookings: 0,
    revenueThisMonth: 0,
    totalConfirmed: 0,
    totalPending: 0,
  });
  const [breakdown, setBreakdown] = useState<MonthlyBreakdown[]>([]);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await getResortStats();
      setTotals({
        totalReservationFees: stats.totalReservationFees ?? 0,
        totalGrossBookings:   stats.totalGrossBookings ?? 0,
        revenueThisMonth:     stats.revenueThisMonth ?? 0,
        totalConfirmed:       stats.totalConfirmed ?? 0,
        totalPending:         stats.totalPending ?? 0,
      });

      try {
        const { data } = await apiClient.get<ApiEnvelope<MonthlyBreakdown[]>>("/resort/revenue/monthly");
        setBreakdown(Array.isArray(data.data) ? data.data : []);
        setMonthlyError(null);
      } catch (err: unknown) {
        setBreakdown([]);
        const status = (err as { response?: { status?: number } })?.response?.status;
        setMonthlyError(
          status === 404
            ? "Monthly breakdown endpoint is not available yet."
            : "Could not load monthly breakdown right now.",
        );
      }
    } catch (err) {
      setError("Failed to load revenue data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const kpis = [
    {
      label: "Fees collected",
      value: `₱${totals.totalReservationFees.toLocaleString()}`,
      sub: "Reservation fees paid to date",
      icon: BadgeDollarSign,
      accent: color.semantic.success,
      rgbKey: rgb.success,
    },
    {
      label: "Gross bookings",
      value: `₱${totals.totalGrossBookings.toLocaleString()}`,
      sub: "Total booking value (all time)",
      icon: TrendingUp,
      accent: color.brand.accentHover,
      rgbKey: rgb.accent,
    },
    {
      label: "Revenue this month",
      value: `₱${totals.revenueThisMonth.toLocaleString()}`,
      sub: "Confirmed bookings · current month",
      icon: ReceiptText,
      accent: color.data.skyBright,
      rgbKey: rgb.sky500,
    },
    {
      label: "Confirmed bookings",
      value: String(totals.totalConfirmed),
      sub: `${totals.totalPending} still pending payment`,
      icon: CalendarCheck2,
      accent: color.data.s6,
      rgbKey: rgb.violet,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="dash-filter-bar w-full md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="dash-page-title flex items-center gap-2">
            <TrendingUp size={22} className="text-accentOrange" /> Revenue Report
          </h1>
          <p className="dash-page-sub">Overview of all reservation revenue for this resort.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="dash-btn-sm disabled:opacity-60">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div className="dash-alert-error">{error}</div>
      )}

      {/* KPI grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-softCard shadow-card md:h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="relative overflow-hidden rounded-2xl bg-softCard p-4 motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 md:p-5"
              style={{ boxShadow: shadowKpiTint(k.rgbKey, 0.14) }}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: k.accent }} />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{ background: `rgba(${k.rgbKey}, 0.04)` }}
              />
              <div className="relative mb-2 flex items-center gap-2 md:mb-3">
                <div className="inline-flex shrink-0 rounded-lg p-1.5 md:p-2" style={{ background: k.accent }}>
                  <k.icon size={14} className="text-white" />
                </div>
                <p className="min-w-0 font-dash text-[11px] font-medium leading-tight text-zinc-600 md:text-dash-xs">{k.label}</p>
              </div>
              <p className="relative break-words font-dash text-lg font-bold leading-tight text-navy md:text-2xl">{k.value}</p>
              <p className="relative mt-1 line-clamp-2 font-dash text-[9px] leading-snug text-zinc-400 md:text-[10px]">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Monthly breakdown table */}
      <DashCard className="overflow-hidden p-0">
        <div className="border-b border-softBorder px-6 py-4">
          <h2 className="font-dash text-base font-semibold text-navy">Monthly breakdown</h2>
          <p className="text-xs text-zinc-400">Revenue and reservation count per month</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-zinc-400">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : breakdown.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-500">
            <TrendingUp size={28} className="mx-auto text-zinc-300 mb-3" />
            <p>No monthly data available yet.</p>
            <p className="text-xs mt-1 text-zinc-400">{monthlyError ?? "No monthly records returned yet."}</p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {breakdown.map((row) => (
                <DashMobileTableCard
                  key={`${row.year}-${row.month}`}
                  title={`${row.month} ${row.year}`}
                  fields={[
                    { label: "Total bookings", value: row.reservations },
                    {
                      label: "Confirmed",
                      value: <span className="dash-badge-emerald">{row.confirmed}</span>,
                    },
                    { label: "Fees collected", value: `₱${Number(row.feesCollected).toLocaleString()}` },
                    { label: "Gross bookings", value: `₱${Number(row.grossBookings).toLocaleString()}` },
                  ]}
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total bookings</th>
                    <th>Confirmed</th>
                    <th>Fees collected</th>
                    <th>Gross bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((row) => (
                    <tr key={`${row.year}-${row.month}`}>
                      <td className="font-semibold text-navy">{row.month} {row.year}</td>
                      <td className="text-zinc-600">{row.reservations}</td>
                      <td>
                        <span className="dash-badge-emerald">{row.confirmed}</span>
                      </td>
                      <td className="font-semibold text-emerald-700">₱{Number(row.feesCollected).toLocaleString()}</td>
                      <td className="text-zinc-700">₱{Number(row.grossBookings).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DashCard>
    </div>
  );
}

