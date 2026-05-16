"use client";

import DashCard from "@/components/dash/DashCard";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
import { createPaymentInvoice, paymentCheckoutReturnBase } from "@/lib/api/payment";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { BadgeCheck, CalendarDays, Clock, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type GuestResort = { id: number; name: string; slug: string; address: string | null; logoUrl?: string | null };

type ReservationRow = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  reservationFee: number;
  room?: { id: number; name: string };
};

export default function GuestDashboardPage() {
  const { user } = useAuth();
  const [resort, setResort] = useState<GuestResort | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        apiClient.get<{ success: boolean; data: GuestResort }>("/guest/resort"),
        apiClient.get<{ success: boolean; data: unknown }>("/reservations", { params: { perPage: 50 } }),
      ]);
      const resortPayload = r1.data?.data;
      setResort(resortPayload && typeof resortPayload === "object" ? resortPayload : null);
      const payload = r2.data.data;
      const list = Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object" && Array.isArray((payload as { data: ReservationRow[] }).data)
          ? (payload as { data: ReservationRow[] }).data
          : [];
      setReservations(list);
    } catch {
      setResort(null);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const pending = reservations.filter((r) => r.status === "pending_payment");
  const firstName = user?.name?.split(" ")[0] ?? "Guest";
  const resortLogoAbs = resort?.logoUrl ? laravelPublicUrl(resort.logoUrl) : "";

  const payingInFlight = useRef(false);

  const onPay = async (id: number) => {
    if (payingInFlight.current) return;
    payingInFlight.current = true;
    setPayingId(id);
    try {
      const result = await createPaymentInvoice(id, { checkoutReturnBase: paymentCheckoutReturnBase() });
      if (result.already_confirmed) {
        await load();
        return;
      }
      if (result.invoice_url) {
        window.location.href = result.invoice_url;
      }
    } finally {
      payingInFlight.current = false;
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="dash-hero-banner-cta flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {resortLogoAbs ? (
            <span className="dash-hero-glass-avatar relative flex h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white/95 shadow-md ring-1 ring-white/30">
              <Image src={resortLogoAbs} alt={`${resort?.name ?? "Resort"} logo`} fill className="object-contain p-1" sizes="56px" unoptimized />
            </span>
          ) : (
            <span className="dash-hero-glass-avatar flex h-14 w-14 shrink-0 items-center justify-center">
              {firstName.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50">Guest stay portal</p>
            <h1 className="mt-0.5 font-dash text-xl font-bold text-white md:text-2xl">Welcome, {firstName}</h1>
            <p className="mt-0.5 text-sm text-white/65">
              {resort ? (
                <>
                  Your home resort is <span className="font-semibold text-white">{resort.name}</span>.
                </>
              ) : loading ? (
                "Loading your resort…"
              ) : (
                "We could not load your resort details."
              )}
            </p>
          </div>
        </div>
        {resort?.slug ? (
          <Link href={`/resort/${encodeURIComponent(resort.slug)}`} className="dash-hero-glass-quiet-cta px-4 py-2.5">
            View landing →
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading your bookings…</p>
      ) : null}

      {pending.length > 0 ? (
        <DashCard className="border-amber-200/80 bg-amber-50/40 p-5">
          <h2 className="font-dash text-lg font-semibold text-navy">Payment needed</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Complete payment to confirm your stay. The reservation fee is collected securely via Xendit.
          </p>
          <ul className="mt-4 space-y-3">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-xl border border-amber-200/60 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-navy">{r.room?.name ?? "Room"}</p>
                  <p className="text-xs text-zinc-600">
                    {r.checkInDate} → {r.checkOutDate} · {r.referenceNo}
                  </p>
                </div>
                <Button
                  type="button"
                  className="shrink-0 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white"
                  disabled={payingId === r.id}
                  onClick={() => void onPay(r.id)}
                >
                  {payingId === r.id ? "Opening…" : "Pay now"}
                </Button>
              </li>
            ))}
          </ul>
        </DashCard>
      ) : null}

      <div className="dash-filter-bar md:flex-row md:flex-wrap">
        <Link href="/dashboard/guest/rooms" className="dash-btn-sm inline-flex items-center gap-2">
          <MapPin size={14} /> Browse rooms
        </Link>
        <Link href="/dashboard/guest/history" className="dash-btn-sm inline-flex items-center gap-2">
          <CalendarDays size={14} /> Travel history
        </Link>
      </div>

      <DashCard className="p-5">
        <h2 className="font-dash text-lg font-semibold text-navy">Recent activity</h2>
        <p className="mt-1 text-sm text-zinc-600">Latest reservations at your resort.</p>
        {reservations.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No bookings yet. Explore rooms and lock a date to get started.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {reservations.slice(0, 6).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className="flex items-center gap-2">
                  {r.status === "pending_payment" ? (
                    <Clock className="text-amber-600" size={14} />
                  ) : (
                    <BadgeCheck className="text-emerald-600" size={14} />
                  )}
                  <span className="font-medium text-navy">{r.room?.name ?? "Room"}</span>
                  <span className="text-zinc-500">
                    {r.checkInDate} → {r.checkOutDate}
                  </span>
                </div>
                <span className="rounded-full bg-softGray px-2 py-0.5 text-xs font-semibold uppercase text-zinc-600">
                  {r.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashCard>
    </div>
  );
}
