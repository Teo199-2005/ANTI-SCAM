"use client";

import DashCard from "@/components/dash/DashCard";
import StatCard from "@/components/dashboard/StatCard";
import DashMobileTableCard from "@/components/shared/DashMobileTableCard";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { BadgeCheck, CalendarDays, Clock, Heart, MapPin, MessageSquare, XCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPhp } from "@/lib/formatPhp";

type ReservationSummary = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  reservationFee: number;
  totalAmount: number;
  resort?: { id: number; name: string };
  room?: { id: number; name: string };
};

type ApiEnvelope<T> = { success: boolean; data: { data: T[] } };

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

const statusIcon: Record<string, React.ReactNode> = {
  confirmed:       <BadgeCheck size={13} />,
  pending_payment: <Clock size={13} />,
  cancelled:       <XCircle size={13} />,
  expired:         <XCircle size={13} />,
  completed:       <BadgeCheck size={13} />,
  no_show:         <XCircle size={13} />,
};

/** Match backend Reservation::REVENUE_ELIGIBLE_STATUSES — fees count toward "total paid" only here. */
const REVENUE_ELIGIBLE_STATUSES = new Set(["confirmed", "completed", "no_show"]);

export default function ClientOverviewPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<ReservationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const firstName = user?.name?.split(" ")[0] ?? "Guest";
  const initials =
    user?.name
      ?.split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "G";

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiClient.get<ApiEnvelope<ReservationSummary>>("/reservations", {
          params: { perPage: 200 },
        });
        setReservations(data.data?.data ?? []);
        setLoadError(false);
      } catch (err) {
        setReservations([]);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const recentFive = reservations.slice(0, 5);
  const confirmed = reservations.filter((r) => r.status === "confirmed").length;
  const pending   = reservations.filter((r) => r.status === "pending_payment").length;
  const totalSpent = reservations.reduce((s, r) => {
    if (!REVENUE_ELIGIBLE_STATUSES.has(r.status)) return s;
    return s + Number(r.reservationFee ?? 0);
  }, 0);
  const completedCount = reservations.filter((r) => r.status === "completed").length;

  return (
    <div className="space-y-6">

      {/* ── Welcome hero banner ──────────────────────────────── */}
      <div className="dash-hero-banner-cta flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <span className="dash-hero-glass-avatar flex h-14 w-14 shrink-0 items-center justify-center">
            {initials}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50">Guest Portal</p>
            <h1 className="mt-0.5 font-dash text-xl font-bold text-white md:text-2xl">
              Welcome back, {firstName}!
            </h1>
            <p className="mt-0.5 text-sm text-white/65">
              Track your staycation bookings and profile details here.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/client/explore"
          className="dash-hero-glass-quiet-cta px-4 py-2.5"
        >
          Explore resorts →
        </Link>
      </div>

      {/* Quick links */}
      <div className="dash-filter-bar md:flex-row md:flex-wrap">
        <Link href="/dashboard/client/explore" className="dash-btn-sm inline-flex items-center gap-2">
          <MapPin size={14} /> Browse &amp; book
        </Link>
        <Link href="/dashboard/client/favorites" className="dash-btn-sm inline-flex items-center gap-2">
          <Heart size={14} /> Favorites
        </Link>
        <Link href="/dashboard/client/reviews" className="dash-btn-sm inline-flex items-center gap-2">
          <MessageSquare size={14} /> Reviews
        </Link>
      </div>

      {/* ── KPI stat cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard compact label="Confirmed bookings" value={confirmed} icon={CalendarDays} iconTone="emerald" />
        <StatCard compact label="Pending payment"    value={pending}   icon={Clock}        iconTone="orange" />
        <StatCard compact label="Total fees paid" value={formatPhp(totalSpent)} icon={TrendingUp} iconTone="sky" />
        <StatCard compact label="Completed stays" value={completedCount} icon={BadgeCheck} iconTone="navy" />
      </div>

      {/* ── Recent bookings ──────────────────────────────────── */}
      <DashCard className="overflow-hidden p-0">
        {/* Section header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-softBorder px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-softGray p-2">
              <CalendarDays size={16} className="text-slateBlue" />
            </div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">Recent bookings</h2>
              <p className="text-xs text-zinc-400">Your latest reservation activity</p>
            </div>
          </div>
          <Link href="/dashboard/client/bookings" className="dash-btn-sm">
            View all
          </Link>
        </div>

        {/* Body */}
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-softGray" />
            ))}
          </div>
        ) : loadError ? (
          <p className="px-6 py-8 text-center text-sm text-rose-600">
            Unable to load bookings. Please refresh the page.
          </p>
        ) : reservations.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-zinc-500">No bookings yet.</p>
            <Link
              href="/dashboard/client/explore"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slateBlue hover:text-navy hover:underline"
            >
              Explore resorts →
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {recentFive.map((r) => (
                <DashMobileTableCard
                  key={r.id}
                  title={
                    <Link href={`/dashboard/client/bookings/${r.id}`} className="font-mono text-sm text-navy hover:underline">
                      {r.referenceNo}
                    </Link>
                  }
                  fields={[
                    { label: "Dates", value: `${r.checkInDate} → ${r.checkOutDate}` },
                    { label: "Total", value: formatPhp(Number(r.totalAmount)) },
                    {
                      label: "Resort",
                      fullWidth: true,
                      value: r.resort ? `${r.resort.name}${r.room?.name ? ` — ${r.room.name}` : ""}` : "—",
                    },
                    {
                      label: "Status",
                      value: (
                        <span className={statusBadge[r.status] ?? "dash-badge-slate"}>
                          {statusIcon[r.status] ?? null}
                          {r.status.replaceAll("_", " ")}
                        </span>
                      ),
                    },
                  ]}
                  actions={
                    r.status === "pending_payment" ? (
                      <Link href={`/dashboard/client/bookings/${r.id}`} className="dash-btn-accent w-full justify-center">
                        Pay now
                      </Link>
                    ) : undefined
                  }
                />
              ))}
            </div>
            <div className="hidden divide-y divide-softBorder md:block">
            {recentFive.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-dsRowHover">
                <div>
                  <Link href={`/dashboard/client/bookings/${r.id}`} className="font-mono text-xs font-semibold text-navy">{r.referenceNo}</Link>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {r.checkInDate} → {r.checkOutDate}
                  </p>
                  {r.resort ? <p className="text-sm text-zinc-600">{r.resort.name}{r.room?.name ? ` — ${r.room.name}` : ""}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-zinc-800">{formatPhp(Number(r.totalAmount))}</p>
                  <span className={statusBadge[r.status] ?? "dash-badge-slate"}>
                    {statusIcon[r.status] ?? null}
                    {r.status.replaceAll("_", " ")}
                  </span>
                  {r.status === "pending_payment" ? (
                    <Link href={`/dashboard/client/bookings/${r.id}`} className="dash-btn-accent">
                      Pay now
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </DashCard>
    </div>
  );
}

