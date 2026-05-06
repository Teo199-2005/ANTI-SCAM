"use client";

import DashCard from "@/components/dash/DashCard";
import ProgressRing from "@/components/dashboard/ProgressRing";
import StatCard from "@/components/dashboard/StatCard";
import { getResortStats, ResortDashboardStats } from "@/lib/api/dashboard";
import { color, rgb, shadowKpiTint } from "@/lib/design-tokens";
import { BadgeDollarSign, CalendarCheck2, DoorOpen, LockKeyhole, ReceiptText, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

export default function ResortOverviewPage() {
  const [stats, setStats] = useState<ResortDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const payload = await getResortStats();
        setStats(payload);
        setError(null);
      } catch (err) {
        setError("Unable to load resort dashboard stats.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-navy/20" />
        <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-softCard/80 shadow-card md:h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800">
        {error ?? "No data available."}
      </div>
    );
  }

  const roomsInUsePct =
    stats.activeRooms > 0
      ? Math.round((stats.lockedBookings / stats.activeRooms) * 100)
      : 0;

  return (
    <div className="space-y-6">

      {/* ── Hero banner ─────────────────────────────────────── */}
      <div className="dash-hero-banner-cta flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">Resort Console</p>
          <h1 className="mt-1 font-dash text-2xl font-bold text-white md:text-3xl">
            Resort Overview
          </h1>
          <p className="mt-1 text-sm text-white/65">
            Monitor your active inventory, new confirmations, and reservation activity.
          </p>
        </div>
        <div className="dash-filter-bar md:flex-row md:flex-wrap">
          <div className="dash-hero-glass-panel px-4 py-3 text-center">
            <p className="text-2xl font-bold text-white">{stats.activeRooms}</p>
            <p className="text-xs text-white/55">Active rooms</p>
          </div>
          <div className="dash-hero-glass-panel px-4 py-3 text-center">
            <p className="text-2xl font-bold text-white">{stats.confirmedToday}</p>
            <p className="text-xs text-white/55">Confirmed today</p>
          </div>
        </div>
      </div>

      {/* ── KPI stat cards (2×2 phone → 4 across md+) ────────── */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <StatCard compact label="Active rooms"    value={stats.activeRooms}    icon={DoorOpen}       iconTone="sky" />
        <StatCard compact label="Locked bookings" value={stats.lockedBookings} icon={LockKeyhole}    iconTone="amber" />
        <StatCard compact label="Confirmed today" value={stats.confirmedToday} icon={CalendarCheck2} iconTone="emerald" />
        {/* Occupancy ring */}
        <div
          className="relative overflow-hidden rounded-2xl bg-softCard p-4 motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 md:p-5"
          style={{ boxShadow: shadowKpiTint(rgb.navy, 0.14) }}
        >
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: color.brand.navy }} />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ background: `rgba(${rgb.navy}, 0.03)` }}
          />
          <p className="relative font-dash text-[11px] font-medium leading-tight text-zinc-600 md:text-dash-xs">Occupancy rate</p>
          <div className="relative mt-2 flex items-center justify-between gap-2 md:mt-3 md:gap-4">
            <div className="shrink-0 scale-[0.82] md:scale-100">
              <ProgressRing
                value={roomsInUsePct}
                color={color.brand.navy}
                trackColor={`rgba(${rgb.navy}, 0.12)`}
              />
            </div>
            <p className="font-dash text-xl font-bold tabular-nums text-navy md:text-dash-3xl">{roomsInUsePct}%</p>
          </div>
        </div>
      </div>

      {/* ── Revenue metrics (2×2 phone → 3 across md+) ───────── */}
      {(stats.totalReservationFees !== undefined || stats.totalGrossBookings !== undefined) && (
        <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3">
          {/* Fees collected */}
          <div
            className="relative overflow-hidden rounded-2xl bg-softCard p-4 motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 md:p-5"
            style={{ boxShadow: shadowKpiTint(rgb.success, 0.14) }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: color.semantic.success }} />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{ background: `rgba(${rgb.success}, 0.04)` }}
            />
            <div className="relative mb-2 flex items-center gap-2 md:mb-3">
              <div className="inline-flex shrink-0 rounded-lg p-1.5 md:p-2" style={{ background: color.semantic.success }}>
                <BadgeDollarSign size={14} className="text-white" />
              </div>
              <p className="min-w-0 font-dash text-[11px] font-medium leading-tight text-zinc-600 md:text-dash-xs">Fees collected</p>
            </div>
            <p className="relative break-words font-dash text-lg font-bold leading-tight text-navy md:text-2xl">
              ₱{Number(stats.totalReservationFees ?? 0).toLocaleString()}
            </p>
            <p className="relative mt-1 line-clamp-2 text-[9px] leading-snug text-zinc-400 md:text-[10px]">Reservation fees paid to date</p>
          </div>

          {/* Gross bookings */}
          <div
            className="relative overflow-hidden rounded-2xl bg-softCard p-4 motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 md:p-5"
            style={{ boxShadow: shadowKpiTint(rgb.accent, 0.14) }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: color.brand.accentHover }} />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{ background: `rgba(${rgb.accent}, 0.04)` }}
            />
            <div className="relative mb-2 flex items-center gap-2 md:mb-3">
              <div className="inline-flex shrink-0 rounded-lg p-1.5 md:p-2" style={{ background: color.brand.accentHover }}>
                <TrendingUp size={14} className="text-white" />
              </div>
              <p className="min-w-0 font-dash text-[11px] font-medium leading-tight text-zinc-600 md:text-dash-xs">Gross bookings</p>
            </div>
            <p className="relative break-words font-dash text-lg font-bold leading-tight text-navy md:text-2xl">
              ₱{Number(stats.totalGrossBookings ?? 0).toLocaleString()}
            </p>
            <p className="relative mt-1 line-clamp-2 text-[9px] leading-snug text-zinc-400 md:text-[10px]">Total booking value (all time)</p>
          </div>

          {/* Revenue this month */}
          <div
            className="relative col-span-2 overflow-hidden rounded-2xl bg-softCard p-4 motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 md:col-span-1 md:p-5"
            style={{ boxShadow: shadowKpiTint(rgb.sky500, 0.14) }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: color.data.skyBright }} />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{ background: `rgba(${rgb.sky500}, 0.04)` }}
            />
            <div className="relative mb-2 flex items-center gap-2 md:mb-3">
              <div className="inline-flex shrink-0 rounded-lg p-1.5 md:p-2" style={{ background: color.data.skyBright }}>
                <ReceiptText size={14} className="text-white" />
              </div>
              <p className="min-w-0 font-dash text-[11px] font-medium leading-tight text-zinc-600 md:text-dash-xs">Revenue this month</p>
            </div>
            <p className="relative break-words font-dash text-lg font-bold leading-tight text-navy md:text-2xl">
              ₱{Number(stats.revenueThisMonth ?? 0).toLocaleString()}
            </p>
            <p className="relative mt-1 line-clamp-2 text-[9px] leading-snug text-zinc-400 md:text-[10px]">Confirmed bookings · current month</p>
          </div>
        </div>
      )}

      {/* ── Recent reservations ──────────────────────────────── */}
      <DashCard className="overflow-hidden p-0">
        {/* Section header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-softBorder px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-emerald-100 p-2">
              <ReceiptText size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">Recent reservations</h2>
              <p className="text-xs text-zinc-400">Latest booking activity</p>
            </div>
          </div>
          <Link href="/dashboard/resort/reservations" className="dash-btn-sm">
            View all
          </Link>
        </div>

        {stats.recentReservations.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No reservations yet.</p>
        ) : (
          <div className="divide-y divide-softBorder">
            {stats.recentReservations.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-dsRowHover"
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-navy">{item.reference_no}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {item.check_in_date} → {item.check_out_date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-emerald-700">
                    ₱{Number(item.total_amount).toLocaleString()}
                  </p>
                  <span className={statusBadge[item.status] ?? "dash-badge-slate"}>
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashCard>
    </div>
  );
}

