"use client";

import PageContainer from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { getReservation, ReservationDetail } from "@/lib/api/payment";
import { getPublicResort } from "@/lib/api/public";
import {
  postPaymentBookingsHref,
  postPaymentBookingsLabel,
  postPaymentResortLandingOrDashboardHref,
  postPaymentResortLandingOrDashboardLabel,
} from "@/lib/postPaymentDashboardLinks";
import { BadgeCheck, CalendarDays, CreditCard, LayoutDashboard, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function ConfirmationPage() {
  const { id: resortIdParam } = useParams();
  const resortId = String(resortIdParam ?? "");
  const searchParams     = useSearchParams();
  const reservationId    = searchParams.get("reservation_id");
  const ref              = searchParams.get("ref");
  const { user, loading: authLoading } = useAuth();

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading]         = useState(true);
  const [resortSlug, setResortSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let slug: string | null = null;
      try {
        if (reservationId) {
          try {
            const data = await getReservation(Number(reservationId));
            if (!cancelled) setReservation(data);
            try {
              const pr = await getPublicResort(data.resortId);
              slug = pr.slug?.trim() || null;
            } catch {
              /* ignore */
            }
          } catch {
            /* ignore */
          }
        }
        if (!slug && resortId) {
          const n = Number(resortId);
          if (Number.isFinite(n) && n > 0) {
            try {
              const pr = await getPublicResort(n);
              slug = pr.slug?.trim() || null;
            } catch {
              /* ignore */
            }
          }
        }
        if (!cancelled) setResortSlug(slug);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reservationId, resortId]);

  const bookingsHref = postPaymentBookingsHref(user?.role, authLoading, "success");
  const bookingsLabel = postPaymentBookingsLabel(user?.role, authLoading);
  const secondaryHref = postPaymentResortLandingOrDashboardHref(resortSlug, user?.role, authLoading);
  const secondaryLabel = postPaymentResortLandingOrDashboardLabel(resortSlug, user?.role, authLoading);

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
            <Link href={bookingsHref} className="glass-inline-btn justify-center text-navy">
              <ReceiptText size={15} />
              {bookingsLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="rounded-full border border-white/30 bg-gradient-to-r from-slateBlue/90 to-navy/90 px-5 py-2.5 text-sm font-semibold text-white shadow-soft backdrop-blur-md transition hover:from-slateBlue hover:to-navy"
            >
              <LayoutDashboard size={15} className="mr-2 inline" />
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
