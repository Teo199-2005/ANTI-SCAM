"use client";

import PageContainer from "@/components/layout/PageContainer";
import { getReservation, ReservationDetail } from "@/lib/api/payment";
import { ArrowLeft, Home, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PaymentFailedPage() {
  const searchParams  = useSearchParams();
  const reservationId = searchParams.get("reservation_id");

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loadingRes, setLoadingRes] = useState(Boolean(reservationId));

  useEffect(() => {
    if (!reservationId) return;
    const load = async () => {
      setLoadingRes(true);
      try {
        const data = await getReservation(Number(reservationId));
        setReservation(data);
      } catch { /* fall through */ } finally {
        setLoadingRes(false);
      }
    };
    void load();
  }, [reservationId]);

  return (
    <PageContainer className="section-padding">
      <div className="mx-auto max-w-md">
        <div className="soft-panel p-10 text-center">
          <div className="glass-pill-icon mx-auto w-fit text-red-600">
            <XCircle size={24} />
          </div>
          <h1 className="mt-5 font-heading text-4xl text-zinc-900">Payment Unsuccessful</h1>
          <p className="mt-3 text-zinc-600">
            We could not complete the payment on Xendit. If your booking is still awaiting payment, open{" "}
            <Link href="/dashboard/client/bookings" className="font-semibold text-navy underline">
              My bookings
            </Link>{" "}
            and use <strong>Pay now</strong> to resume or refresh checkout.
          </p>

          {loadingRes ? (
            <div className="mx-auto mt-5 flex justify-center">
              <svg className="h-5 w-5 animate-spin text-red-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          ) : reservation ? (
            <div className="mx-auto mt-5 max-w-xs rounded-xl border border-red-200 bg-red-50/60 p-4 text-left text-sm">
              <p className="font-semibold text-red-800">Reservation: {reservation.referenceNo}</p>
              <p className="mt-1 text-red-700">
                Status: <span className="font-semibold">{reservation.status.replaceAll("_", " ")}</span>
              </p>
            </div>
          ) : null}

          <p className="mt-5 text-sm text-zinc-500">
            No charge was made. Please try booking again. If the problem persists, contact our support team.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/dashboard/client/bookings"
              className="glass-inline-btn justify-center text-navy"
            >
              My bookings
            </Link>
            <Link href="/resorts" className="glass-inline-btn justify-center text-navy">
              <ArrowLeft size={15} />
              Browse resorts
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/30 bg-gradient-to-r from-slateBlue/90 to-navy/90 px-5 py-2.5 text-sm font-semibold text-white shadow-soft backdrop-blur-md transition hover:from-slateBlue hover:to-navy"
            >
              <Home size={14} className="mr-2 inline" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
