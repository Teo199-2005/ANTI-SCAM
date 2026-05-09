"use client";

import PageContainer from "@/components/layout/PageContainer";
import { getReservation, ReservationDetail } from "@/lib/api/payment";
import { BadgeCheck, CalendarDays, Home, ReceiptText } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const searchParams  = useSearchParams();
  const reservationId = searchParams.get("reservation_id");
  const ref           = searchParams.get("ref");

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!reservationId) { setLoading(false); return; }
    const load = async () => {
      try {
        const data = await getReservation(Number(reservationId));
        setReservation(data);
      } catch { /* fall through */ }
      finally { setLoading(false); }
    };
    void load();
  }, [reservationId]);

  const paymentState = reservation?.xenditPaymentStatus ?? "pending";
  const isConfirmed = reservation?.status === "confirmed" && paymentState === "paid";
  const isProcessing = !reservation || (!isConfirmed && paymentState === "pending");

  return (
    <PageContainer className="section-padding">
      <div className="mx-auto max-w-lg">
        <div className="soft-panel p-10 text-center">
          <div className="glass-pill-icon mx-auto w-fit text-emerald-700">
            <BadgeCheck size={24} />
          </div>
          <h1 className="mt-5 font-heading text-4xl text-zinc-900">
            {isConfirmed ? "Payment Successful!" : "Payment Received"}
          </h1>
          <p className="mt-3 text-zinc-600">
            {isConfirmed
              ? "Your reservation fee has been received. Your booking is confirmed."
              : "Your payment is being verified. Booking confirmation will appear once Xendit webhook processing completes."}
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading booking details…</p>
          ) : null}

          {(reservation ?? ref) ? (
            <div className="mx-auto mt-6 max-w-xs space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-left text-sm">
              <p className="font-semibold text-emerald-900">Booking Reference</p>
              <p className="font-mono text-emerald-800">{reservation?.referenceNo ?? ref}</p>
              {reservation ? (
                <p className="inline-flex items-center gap-1.5 pt-1 text-emerald-700">
                  <CalendarDays size={13} />
                  {reservation.checkInDate} → {reservation.checkOutDate}
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="mt-5 text-sm text-zinc-500">
            {isProcessing
              ? "Please wait a moment and refresh this page if confirmation is still processing."
              : "A confirmation email has been sent to your registered address. The remaining balance is payable directly at the resort upon check-in."}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link href="/dashboard/client/bookings" className="glass-inline-btn justify-center text-navy">
              <ReceiptText size={15} />
              My Bookings
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

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="section-padding">
          <div className="soft-panel mx-auto max-w-lg p-10 text-center text-zinc-600">Loading…</div>
        </PageContainer>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
