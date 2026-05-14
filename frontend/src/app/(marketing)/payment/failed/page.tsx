"use client";

import PageContainer from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicResort } from "@/lib/api/public";
import { getReservation, ReservationDetail } from "@/lib/api/payment";
import {
  postPaymentBookingsHref,
  postPaymentBookingsLabel,
  postPaymentDashboardReturnHref,
  postPaymentResortLandingOrDashboardHref,
  postPaymentResortLandingOrDashboardLabel,
} from "@/lib/postPaymentDashboardLinks";
import { LayoutDashboard, XCircle } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PaymentFailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservation_id");
  const ref = searchParams.get("ref");
  const { user, loading: authLoading } = useAuth();

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loadingRes, setLoadingRes] = useState(Boolean(reservationId));
  const [resortSlug, setResortSlug] = useState<string | null>(null);

  const dashboardReturnHref =
    !authLoading && reservationId
      ? postPaymentDashboardReturnHref(user?.role, "failed", { reservationId, ref })
      : null;

  useEffect(() => {
    if (dashboardReturnHref) {
      router.replace(dashboardReturnHref);
    }
  }, [dashboardReturnHref, router]);

  useEffect(() => {
    if (!reservationId || dashboardReturnHref) {
      if (!reservationId) setLoadingRes(false);
      return;
    }
    const load = async () => {
      setLoadingRes(true);
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
        setLoadingRes(false);
      }
    };
    void load();
  }, [reservationId, dashboardReturnHref]);

  const bookingsHref = postPaymentBookingsHref(user?.role, authLoading, "failed");
  const bookingsLabel = postPaymentBookingsLabel(user?.role, authLoading);
  const secondaryHref = postPaymentResortLandingOrDashboardHref(resortSlug, user?.role, authLoading);
  const secondaryLabel = postPaymentResortLandingOrDashboardLabel(resortSlug, user?.role, authLoading);

  if (dashboardReturnHref) {
    return (
      <PageContainer className="section-padding">
        <div className="soft-panel mx-auto max-w-md p-10 text-center text-zinc-600">Continuing to your dashboard…</div>
      </PageContainer>
    );
  }

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
            <Link href={bookingsHref} className="font-semibold text-navy underline">
              {bookingsLabel}
            </Link>{" "}
            and use <strong>Pay now</strong> (or complete checkout again) to resume.
          </p>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-left text-sm text-amber-950">
            <strong>Room hold:</strong> checkout starts a short hold on your dates. If payment was not finished in time,
            the hold may have expired — pick the same room and dates again, then complete payment promptly.
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
            <Link href={bookingsHref} className="glass-inline-btn justify-center text-navy">
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

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="section-padding">
          <div className="soft-panel mx-auto max-w-md p-10 text-center text-zinc-600">Loading…</div>
        </PageContainer>
      }
    >
      <PaymentFailedContent />
    </Suspense>
  );
}
