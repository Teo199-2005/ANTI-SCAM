"use client";

import PageContainer from "@/components/layout/PageContainer";
import { getReservation, ReservationDetail } from "@/lib/api/payment";
import { BadgeCheck, CalendarDays, CreditCard, Home } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resortId } = use(params);
  const searchParams     = useSearchParams();
  const reservationId    = searchParams.get("reservation_id");
  const ref              = searchParams.get("ref");

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!reservationId) { setLoading(false); return; }
    const load = async () => {
      try {
        const data = await getReservation(Number(reservationId));
        setReservation(data);
      } catch {
        // fall through — use ref from query param
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [reservationId]);

  const status = reservation?.status ?? "pending_payment";
  const isPaid = status === "confirmed";

  return (
    <PageContainer className="section-padding">
      <div className="mx-auto max-w-lg">
        <div className="soft-panel p-10 text-center">
          <div
            className={`glass-pill-icon mx-auto w-fit ${
              isPaid ? "text-emerald-700" : "text-amber-600"
            }`}
          >
            {isPaid ? <BadgeCheck size={24} /> : <CreditCard size={24} />}
          </div>

          <h1 className="mt-5 font-heading text-4xl text-zinc-900">
            {isPaid ? "Booking Confirmed!" : "Payment Pending"}
          </h1>
          <p className="mt-3 text-zinc-600">
            {isPaid
              ? "Your reservation is confirmed. We'll see you at the resort!"
              : "Your reservation is awaiting payment confirmation. Check your email for updates."}
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading reservation details…</p>
          ) : null}

          {(reservation ?? ref) ? (
            <div className="mx-auto mt-6 max-w-xs space-y-2 rounded-xl border border-white/40 bg-white/30 p-4 text-sm text-left backdrop-blur-md">
              <p className="font-semibold text-zinc-800">Reference No.</p>
              <p className="font-mono text-zinc-900">{reservation?.referenceNo ?? ref}</p>
              {reservation ? (
                <>
                  <div className="flex items-center gap-2 pt-2 text-zinc-600">
                    <CalendarDays size={14} />
                    <span>
                      {reservation.checkInDate} → {reservation.checkOutDate}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Status:{" "}
                    <span
                      className={isPaid ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}
                    >
                      {status.replaceAll("_", " ")}
                    </span>
                  </p>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={`/resorts/${resortId}`}
              className="glass-inline-btn justify-center text-navy"
            >
              <Home size={15} />
              Back to Resort
            </Link>
            <Link
              href="/dashboard/client/bookings"
              className="rounded-full border border-white/30 bg-gradient-to-r from-slateBlue/90 to-navy/90 px-5 py-2.5 text-sm font-semibold text-white shadow-soft backdrop-blur-md transition hover:from-slateBlue hover:to-navy"
            >
              View My Bookings →
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
