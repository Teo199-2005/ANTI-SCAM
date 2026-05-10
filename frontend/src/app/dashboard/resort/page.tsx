"use client";

import DashCard from "@/components/dash/DashCard";
import DashModal from "@/components/dash/DashModal";
import ProgressRing from "@/components/dashboard/ProgressRing";
import StatCard from "@/components/dashboard/StatCard";
import {
  getResortBookingCalendar,
  getResortStats,
  ResortBookingCalendarReservation,
  ResortDashboardStats,
} from "@/lib/api/dashboard";
import { getOwnerLandingPage } from "@/lib/api/landingPage";
import { syncPendingSubscriptionInvoice } from "@/lib/api/subscription";
import { color, rgb, shadowKpiTint } from "@/lib/design-tokens";
import { useToast } from "@/components/shared/ToastProvider";
import { BadgeDollarSign, CalendarCheck2, CalendarDays, DoorOpen, LockKeyhole, ReceiptText, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

export default function ResortOverviewPage() {
  const { pushToast } = useToast();
  const [stats, setStats] = useState<ResortDashboardStats | null>(null);
  const [calendarReservations, setCalendarReservations] = useState<ResortBookingCalendarReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calendarMonth = useMemo(() => new Date(), []);
  const monthStart = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1),
    [calendarMonth],
  );
  const monthEnd = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0),
    [calendarMonth],
  );
  const monthLabel = useMemo(
    () => monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    [monthStart],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;

    const stripPaymentQuery = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    };

    const notifyTopbar = () => {
      window.dispatchEvent(new CustomEvent("subscription:refresh"));
    };

    if (payment === "failed") {
      pushToast({
        title: "Payment not completed",
        description: "You can try again from Subscribe now in the top bar.",
        tone: "warning",
      });
      stripPaymentQuery();
      notifyTopbar();
      return;
    }

    if (payment === "success") {
      void (async () => {
        try {
          const landing = await getOwnerLandingPage();
          const result = await syncPendingSubscriptionInvoice(landing.resort_id);
          if (result.synced) {
            pushToast({
              title: "Subscription active",
              description: "Your payment was confirmed. Premium status is updated.",
              tone: "success",
            });
          } else if (result.gateway_status === "PENDING") {
            pushToast({
              title: "Payment processing",
              description: "The provider still shows pending. Wait a few seconds and refresh, or check your email.",
              tone: "info",
            });
          } else {
            pushToast({
              title: "Payment received",
              description: "If the top bar still shows pending, refresh the page in a moment.",
              tone: "success",
            });
          }
        } catch {
          pushToast({
            title: "Could not confirm instantly",
            description: "Your payment may still succeed via webhook. Refresh shortly or contact support if it stays pending.",
            tone: "warning",
          });
        } finally {
          stripPaymentQuery();
          notifyTopbar();
        }
      })();
      return;
    }

    stripPaymentQuery();
    notifyTopbar();
  }, [pushToast]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const [statsResult, calendarResult] = await Promise.allSettled([
          getResortStats(),
          getResortBookingCalendar(now.getFullYear(), now.getMonth() + 1),
        ]);
        if (statsResult.status !== "fulfilled") {
          throw new Error("stats_failed");
        }
        setStats(statsResult.value);
        setCalendarReservations(
          calendarResult.status === "fulfilled" ? calendarResult.value.reservations : [],
        );
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

  const normalizeDate = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const dateToKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const isDateInRange = (target: Date, start: Date, end: Date) => target >= start && target <= end;

  const daysInMonth = monthEnd.getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1);
    const key = dateToKey(date);
    const reservations = calendarReservations.filter((item) =>
      isDateInRange(date, normalizeDate(item.check_in_date), normalizeDate(item.check_out_date)),
    );
    const hasConfirmed = reservations.some((r) => r.status === "confirmed");
    const hasPending = reservations.some((r) => r.status === "pending_payment");
    return { key, day: i + 1, reservations, hasConfirmed, hasPending };
  });

  const firstDayOffset = (monthStart.getDay() + 6) % 7;
  const selectedReservations = selectedDate
    ? monthDays.find((d) => d.key === selectedDate)?.reservations ?? []
    : [];

  return (
    <div className="min-w-0 max-w-full space-y-6">

      {/* ── Hero banner ─────────────────────────────────────── */}
      <div className="dash-hero-banner-cta flex w-full min-w-0 max-w-full flex-col gap-5 max-md:p-5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4 md:p-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">Resort Console</p>
          <h1 className="mt-1 font-dash text-2xl font-bold text-white md:text-3xl">
            Resort Overview
          </h1>
          <p className="mt-1 text-sm leading-snug text-white/65">
            Monitor your active inventory, new confirmations, and reservation activity.
          </p>
        </div>
        <div className="grid w-full min-w-0 max-w-full grid-cols-[repeat(2,minmax(0,1fr))] gap-2 sm:gap-3 md:w-auto md:max-w-md md:gap-3">
          <div className="dash-hero-glass-panel flex min-h-[4.25rem] min-w-0 flex-col justify-center px-3 py-3 text-center ring-1 ring-inset ring-white/10 sm:min-h-0 sm:px-4">
            <p className="text-xl font-bold tabular-nums text-white sm:text-2xl">{stats.activeRooms}</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/65 sm:text-xs">Active rooms</p>
          </div>
          <div className="dash-hero-glass-panel flex min-h-[4.25rem] min-w-0 flex-col justify-center px-3 py-3 text-center ring-1 ring-inset ring-white/10 sm:min-h-0 sm:px-4">
            <p className="text-xl font-bold tabular-nums text-white sm:text-2xl">{stats.confirmedToday}</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/65 sm:text-xs">Confirmed today</p>
          </div>
        </div>
      </div>

      {/* ── KPI stat cards (2×2 phone → 4 across md+) ────────── */}
      <div className="grid min-w-0 grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
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
        <div className="grid min-w-0 grid-cols-2 gap-3 md:gap-4 md:grid-cols-3">
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

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* ── Booking calendar ──────────────────────────────── */}
        <DashCard className="min-w-0 overflow-hidden p-0">
          <div className="border-b border-softBorder px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex rounded-lg bg-primaryBlue/10 p-2">
                <CalendarDays size={16} className="text-primaryBlue" />
              </div>
              <div className="min-w-0">
                <h2 className="font-dash text-base font-semibold text-navy">Booking calendar</h2>
                <p className="text-xs text-zinc-400">{monthLabel}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-3 sm:p-4">
            <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400 sm:gap-1 sm:text-[10px]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day} className="min-w-0 truncate px-0.5 py-1">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-0.5 sm:gap-1">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-11 rounded-xl bg-transparent sm:h-10 sm:rounded-lg" />
              ))}
              {monthDays.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDate(day.key)}
                  className={`relative min-h-11 min-w-0 rounded-xl border px-0.5 pb-3 text-sm font-semibold [touch-action:manipulation] motion-safe:transition sm:h-10 sm:rounded-lg sm:pb-2 sm:text-xs ${
                    day.reservations.length > 0
                      ? "border-primaryBlue/40 bg-primaryBlue/10 text-navy hover:bg-primaryBlue/15 active:bg-primaryBlue/20"
                      : "border-softBorder bg-white text-zinc-500 hover:bg-softGray/50 active:bg-softGray/70"
                  }`}
                >
                  {day.day}
                  {day.reservations.length > 0 ? (
                    <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1">
                      <span className={`h-2 w-2 rounded-full sm:h-1.5 sm:w-1.5 ${day.hasConfirmed ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {day.hasConfirmed && day.hasPending ? (
                        <span className="h-2 w-2 rounded-full bg-amber-500 sm:h-1.5 sm:w-1.5" />
                      ) : null}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-softBorder/90 bg-softGray/35 p-3 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-2 sm:border-transparent sm:bg-transparent sm:p-0">
              <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white/90 px-3 text-xs font-medium text-zinc-600 shadow-sm ring-1 ring-softBorder/60 sm:min-h-0 sm:bg-transparent sm:px-0 sm:text-[11px] sm:text-zinc-500 sm:shadow-none sm:ring-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                Confirmed booking
              </span>
              <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white/90 px-3 text-xs font-medium text-zinc-600 shadow-sm ring-1 ring-softBorder/60 sm:min-h-0 sm:bg-transparent sm:px-0 sm:text-[11px] sm:text-zinc-500 sm:shadow-none sm:ring-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                Pending booking
              </span>
            </div>
          </div>
        </DashCard>

        {/* ── Recent reservations ──────────────────────────────── */}
        <DashCard className="min-w-0 overflow-hidden p-0">
          {/* Section header */}
          <div className="flex flex-col gap-3 border-b border-softBorder px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="inline-flex rounded-lg bg-emerald-100 p-2">
                <ReceiptText size={16} className="text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h2 className="font-dash text-base font-semibold text-navy">Recent reservations</h2>
                <p className="text-xs text-zinc-400">Latest booking activity</p>
              </div>
            </div>
            <Link
              href="/dashboard/resort/reservations"
              className="dash-btn-sm flex w-full justify-center sm:w-auto sm:flex-initial"
            >
              View all
            </Link>
          </div>

          {stats.recentReservations.length === 0 ? (
            <p className="px-4 py-8 text-sm text-zinc-500 sm:px-6">No reservations yet.</p>
          ) : (
            <div className="divide-y divide-softBorder">
              {stats.recentReservations.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-dsRowHover sm:px-6"
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

      <DashModal
        open={Boolean(selectedDate)}
        onClose={() => setSelectedDate(null)}
        title="Date booking details"
        description={selectedDate ?? undefined}
        className="max-w-xl"
      >
        {selectedReservations.length === 0 ? (
          <p className="text-sm text-zinc-500">No bookings for this date.</p>
        ) : (
          <div className="space-y-2">
            {selectedReservations.map((item) => (
              <div key={item.id} className="rounded-xl border border-softBorder bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs font-semibold text-navy">{item.reference_no}</p>
                  <span className={statusBadge[item.status] ?? "dash-badge-slate"}>
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.check_in_date} → {item.check_out_date}
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  ₱{Number(item.total_amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </DashModal>
    </div>
  );
}

