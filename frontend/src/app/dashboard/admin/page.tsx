"use client";

import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard from "@/components/shared/DashMobileTableCard";
import StatCard from "@/components/dashboard/StatCard";
import { getAdminStats, AdminStats } from "@/lib/api/admin";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { color, kpiTone } from "@/lib/design-tokens";
import {
  AlertTriangle,
  CheckCircle2,
  Building2,
  CalendarDays,
  Clock3,
  DollarSign,
  Globe2,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

function percent(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setStats(null);
      setError(parseApiErrorMessage(err, "Failed to load admin stats."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Hero skeleton */}
        <div className="h-28 animate-pulse rounded-2xl bg-navy/20" />
        {/* Stat card skeletons */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-softCard/80 shadow-card md:h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-900">
        <p className="text-sm leading-relaxed">{error ?? "No data."}</p>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
          Try again
        </button>
      </div>
    );
  }

  const confirmedPct = percent(stats.confirmedReservations, stats.totalReservations);
  const pendingPct   = percent(stats.pendingPayment, stats.totalReservations);
  const publicPct    = percent(stats.publicResorts, stats.totalResorts);
  const suspendedPct = percent(stats.suspendedResorts, stats.totalResorts);

  return (
    <div className="space-y-6">

      {/* ── Hero banner ─────────────────────────────────────── */}
      <div className="dash-hero-banner">
        <p className="font-dash text-dash-xs font-medium text-white/70">Admin console</p>
        <h1 className="mt-1 font-dash text-dash-3xl font-bold text-white md:text-dash-4xl">Platform overview</h1>
        <p className="mt-1 max-w-xl font-dash text-dash-sm text-white/80">
          System-wide metrics and recent activity. Detailed KPIs follow below — no duplicate counts in the hero.
        </p>
      </div>

      {/* ── Primary KPI stat cards (2×2 phone → 4 across lg) ───── */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard compact label="Total resorts"      value={stats.totalResorts}                         icon={Building2}    iconTone="navy" />
        <StatCard compact label="Total users"        value={stats.totalUsers}                           icon={Users}        iconTone="violet" />
        <StatCard compact label="Total reservations" value={stats.totalReservations}                    icon={CalendarDays} iconTone="sky" />
        <StatCard compact label="Total revenue"      value={`₱${stats.totalRevenue.toLocaleString()}`} icon={DollarSign}   iconTone="emerald" />
      </div>

      {/* ── Minimal KPI split: ratios left, growth right ─────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashCard className="overflow-hidden p-0">
          <div className="grid grid-cols-1 divide-y divide-softBorder">
            {[
              {
                label: "Confirmed bookings",
                pct: confirmedPct,
                count: stats.confirmedReservations,
                accent: color.semantic.success,
                icon: CheckCircle2,
              },
              {
                label: "Pending payment",
                pct: pendingPct,
                count: stats.pendingPayment,
                accent: color.semantic.warning,
                icon: Clock3,
              },
              {
                label: "Public resorts",
                pct: publicPct,
                count: stats.publicResorts,
                accent: color.data.skyBright,
                icon: Globe2,
              },
              {
                label: "Suspended resorts",
                pct: suspendedPct,
                count: stats.suspendedResorts,
                accent: color.semantic.error,
                icon: AlertTriangle,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="space-y-2 p-4 motion-safe:animate-dash-fade-in md:p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 font-dash text-[12px] font-semibold leading-tight text-zinc-700 md:text-dash-sm">
                      <item.icon size={14} style={{ color: item.accent }} />
                      {item.label}
                    </p>
                    <p className="mt-0.5 font-dash text-[10px] text-zinc-500">Share of total · raw count on right</p>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-3">
                    <p className="font-dash text-sm font-semibold tabular-nums text-zinc-600 md:text-base">{item.pct}%</p>
                    <p className="min-w-[2.25rem] text-right font-dash text-2xl font-bold tabular-nums text-navy">{item.count}</p>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-softGray">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${item.pct}%`, background: item.accent }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DashCard>

        <DashCard className="overflow-hidden p-0">
          <div className="grid grid-cols-1 divide-y divide-softBorder">
          {/* Revenue panel */}
          <div
            className="relative overflow-hidden p-4 motion-safe:animate-dash-fade-in md:p-5"
          >
            <div className="relative flex items-center gap-2">
              <div className="inline-flex shrink-0 rounded-lg p-1.5" style={{ background: color.brand.accentHover }}>
                <TrendingUp className="h-3.5 w-3.5 text-white" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="font-dash text-xs font-semibold leading-tight text-zinc-700">Revenue this month</p>
                <p className="mt-0.5 font-dash text-[10px] text-zinc-500">From confirmed reservations</p>
              </div>
            </div>
            <p className="relative mt-2 break-words font-dash text-2xl font-bold leading-tight text-navy md:text-3xl">₱{stats.revenueThisMonth.toLocaleString()}</p>
          </div>

          {/* New users panel */}
          <div
            className="relative overflow-hidden p-4 motion-safe:animate-dash-fade-in md:p-5"
          >
            <div className="relative flex items-center gap-2">
              <div className="inline-flex shrink-0 rounded-lg p-1.5" style={{ background: kpiTone.blue.accent }}>
                <Users className="h-3.5 w-3.5 text-white" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="font-dash text-xs font-semibold leading-tight text-zinc-700">New users (7 days)</p>
                <p className="mt-0.5 font-dash text-[10px] text-zinc-500">Registered in the last 7 days</p>
              </div>
            </div>
            <p className="relative mt-2 font-dash text-2xl font-bold tabular-nums text-navy md:text-3xl">{stats.newUsersThisWeek}</p>
          </div>
        </div>
        </DashCard>
      </div>

      <DashCard className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-softBorder px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-clOcean/10 p-2 ring-1 ring-clOcean/10">
              <CalendarDays size={16} className="text-clOcean" />
            </div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">Recent reservations</h2>
              <p className="text-xs text-zinc-500">Latest across all resorts</p>
            </div>
          </div>
          <Link href="/dashboard/admin/reservations" className="dash-btn-sm">
            View all
          </Link>
        </div>

        {stats.recentReservations.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No reservations yet.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {stats.recentReservations.map((r) => (
                <DashMobileTableCard
                  key={r.id}
                  title={<span className="font-mono text-sm">{r.reference_no}</span>}
                  fields={[
                    { label: "Check-in", value: r.check_in_date },
                    { label: "Check-out", value: r.check_out_date },
                    { label: "Fee", value: `₱${Number(r.reservation_fee).toLocaleString()}` },
                    {
                      label: "Status",
                      value: (
                        <span className={statusBadge[r.status] ?? "dash-badge-slate"}>
                          {r.status.replaceAll("_", " ")}
                        </span>
                      ),
                    },
                  ]}
                  actions={
                    <Link href="/dashboard/admin/reservations" className="dash-btn-sm w-full justify-center">
                      View all reservations
                    </Link>
                  }
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Fee</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentReservations.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs font-semibold text-navy">{r.reference_no}</td>
                      <td className="text-zinc-600">{r.check_in_date}</td>
                      <td className="text-zinc-600">{r.check_out_date}</td>
                      <td className="font-semibold text-zinc-800">₱{Number(r.reservation_fee).toLocaleString()}</td>
                      <td>
                        <span className={statusBadge[r.status] ?? "dash-badge-slate"}>
                          {r.status.replaceAll("_", " ")}
                        </span>
                      </td>
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

