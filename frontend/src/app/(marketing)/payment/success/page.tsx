"use client";

import PageContainer from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicResort } from "@/lib/api/public";
import { getReservation, ReservationDetail } from "@/lib/api/payment";
import { formatPhp, formatStayRange } from "@/lib/formatPhp";
import {
  postPaymentBookingsHref,
  postPaymentBookingsLabel,
  postPaymentDashboardReturnHref,
  postPaymentResortLandingOrDashboardHref,
  postPaymentResortLandingOrDashboardLabel,
} from "@/lib/postPaymentDashboardLinks";
import { BadgeCheck, CalendarDays, LayoutDashboard, ReceiptText } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservation_id");
  const ref = searchParams.get("ref");
  const { user, loading: authLoading } = useAuth();

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resortSlug, setResortSlug] = useState<string | null>(null);

  const dashboardReturnHref =
    !authLoading && reservationId
      ? postPaymentDashboardReturnHref(user?.role, "success", {
          reservationId,
          ref,
        })
      : null;

  useEffect(() => {
    if (dashboardReturnHref) {
      router.replace(dashboardReturnHref);
    }
  }, [dashboardReturnHref, router]);

  useEffect(() => {
    if (!reservationId || dashboardReturnHref) {
      if (!reservationId) setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const data = await getReservation(Number(reservationId));
        setReservation(data);
        try {
          const pr = await getPublicResort(data.resortId);
          setResortSlug(pr.slug?.trim() || null);
        } catch {
          setResortSlug(null);
        }
      } catch {
        /* fall through */
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [reservationId, dashboardReturnHref]);

  const bookingsHref = postPaymentBookingsHref(user?.role, authLoading, "success");
  const bookingsLabel = postPaymentBookingsLabel(user?.role, authLoading);
  const secondaryHref = postPaymentResortLandingOrDashboardHref(resortSlug, user?.role, authLoading);
  const secondaryLabel = postPaymentResortLandingOrDashboardLabel(resortSlug, user?.role, authLoading);

  const paymentState = reservation?.xenditPaymentStatus ?? "pending";
  const isConfirmed = reservation?.status === "confirmed" && paymentState === "paid";
  const isProcessing = !reservation || (!isConfirmed && paymentState === "pending");

  if (dashboardReturnHref) {
    return (
      <PageContainer className="section-padding">
        <div className="soft-panel mx-auto max-w-lg p-10 text-center text-zinc-600">Continuing to your dashboard…</div>
      </PageContainer>
    );
  }

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
                  {formatStayRange(reservation.checkInDate, reservation.checkOutDate)}
                </p>
              ) : null}
            </div>
          ) : null}

          {reservation && Number(reservation.totalAmount) > 0 ? (
            <p className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm text-zinc-700">
              Remaining balance due at check-in:{" "}
              <span className="font-bold text-navy tabular-nums">{formatPhp(Number(reservation.totalAmount))}</span>
              <span className="mt-1 block text-xs text-zinc-600">
                Reservation fee paid online: {formatPhp(Number(reservation.reservationFee))}
              </span>
            </p>
          ) : null}

          <p className="mt-5 text-sm text-zinc-500">
            {isProcessing
              ? "Please wait a moment and refresh this page if confirmation is still processing."
              : "A confirmation email has been sent to your registered address. The remaining balance is payable directly at the resort upon check-in."}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link href={bookingsHref} className="glass-inline-btn justify-center text-navy">
              <ReceiptText size={15} />
              {bookingsLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="rounded-full border border-white/30 bg-gradient-to-r from-slateBlue/90 to-navy/90 px-5 py-2.5 text-sm font-semibold text-white shadow-soft backdrop-blur-md transition hover:from-slateBlue hover:to-navy"
            >
              <LayoutDashboard size={14} className="mr-2 inline" />
              {secondaryLabel}
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
