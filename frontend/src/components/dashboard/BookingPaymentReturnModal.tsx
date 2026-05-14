"use client";

import DashModal from "@/components/dash/DashModal";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicResort } from "@/lib/api/public";
import { getReservation, type ReservationDetail } from "@/lib/api/payment";
import {
  postPaymentResortLandingOrDashboardHref,
  postPaymentResortLandingOrDashboardLabel,
} from "@/lib/postPaymentDashboardLinks";
import { BadgeCheck, CalendarDays, LayoutDashboard, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export type BookingPaymentReturnFlow = "success" | "failed";

type Props = {
  open: boolean;
  onClose: () => void;
  flow: BookingPaymentReturnFlow;
  reservationId: string;
  refFallback: string | null;
};

export default function BookingPaymentReturnModal({
  open,
  onClose,
  flow,
  reservationId,
  refFallback,
}: Props) {
  const { user, loading: authLoading } = useAuth();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [resortSlug, setResortSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !reservationId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const data = await getReservation(Number(reservationId));
        if (cancelled) return;
        setReservation(data);
        try {
          const pr = await getPublicResort(data.resortId);
          if (cancelled) return;
          setResortSlug(pr.slug?.trim() || null);
        } catch {
          if (!cancelled) setResortSlug(null);
        }
      } catch {
        if (!cancelled) setReservation(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, reservationId]);

  useEffect(() => {
    if (!open) {
      setReservation(null);
      setResortSlug(null);
      setLoading(false);
    }
  }, [open]);

  const secondaryHref = postPaymentResortLandingOrDashboardHref(resortSlug, user?.role, authLoading);
  const secondaryLabel = postPaymentResortLandingOrDashboardLabel(resortSlug, user?.role, authLoading);

  const paymentState = reservation?.xenditPaymentStatus ?? "pending";
  const isConfirmed = reservation?.status === "confirmed" && paymentState === "paid";
  const isProcessing = flow === "success" && (!reservation || (!isConfirmed && paymentState === "pending"));

  if (flow === "failed") {
    return (
      <DashModal
        open={open}
        onClose={onClose}
        title={
          <span className="flex items-center gap-2 text-navy">
            <XCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
            <span>Payment unsuccessful</span>
          </span>
        }
        description="We could not complete the payment on Xendit."
        className="max-w-lg"
        initialFocusSelector='[data-booking-payment-primary="true"]'
      >
        <div className="space-y-4 text-sm text-zinc-600">
          <p>
            If your booking is still awaiting payment, use <strong>Pay</strong> on the list below to open checkout
            again, or start a new booking from Rooms.
          </p>
          <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-amber-950">
            <strong>Room hold:</strong> checkout starts a short hold on your dates. If payment was not finished in
            time, the hold may have expired — pick the same room and dates again, then complete payment promptly.
          </p>
          {loading ? <p className="text-zinc-500">Loading booking details…</p> : null}
          {!loading && reservation ? (
            <div className="rounded-xl border border-red-200 bg-red-50/70 px-3 py-2.5 text-red-900">
              <p className="font-semibold">Reservation: {reservation.referenceNo}</p>
              <p className="mt-1 text-red-800">
                Status: <span className="font-semibold">{reservation.status.replaceAll("_", " ")}</span>
              </p>
            </div>
          ) : null}
          {!loading && !reservation && refFallback ? (
            <div className="rounded-xl border border-red-200 bg-red-50/70 px-3 py-2.5 text-red-900">
              <p className="font-semibold">Reference</p>
              <p className="font-mono text-sm">{refFallback}</p>
            </div>
          ) : null}
          <p className="text-xs text-zinc-500">No charge was made. If the problem persists, contact support.</p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              data-booking-payment-primary="true"
              onClick={onClose}
              className="dash-btn-primary w-full justify-center px-4 py-2.5"
            >
              View list below
            </button>
            <Link
              href={secondaryHref}
              className="dash-btn-sm inline-flex w-full items-center justify-center gap-2 border border-softBorder bg-softCard px-4 py-2.5 font-semibold text-navy shadow-dash-btn-sm hover:bg-softGray"
            >
              <LayoutDashboard size={15} aria-hidden />
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </DashModal>
    );
  }

  return (
    <DashModal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 text-navy">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <BadgeCheck className="h-5 w-5" aria-hidden />
          </span>
          <span>{isConfirmed ? "Payment successful" : "Payment received"}</span>
        </span>
      }
      description={
        isConfirmed
          ? "Your reservation fee has been received. Your booking is confirmed."
          : "Your payment is being verified. Booking confirmation will appear once Xendit webhook processing completes."
      }
      className="max-w-lg"
      initialFocusSelector='[data-booking-payment-primary="true"]'
    >
      <div className="space-y-4 text-sm text-zinc-600">
        {loading ? <p className="text-zinc-500">Loading booking details…</p> : null}

        {(reservation ?? refFallback) ? (
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Booking reference</p>
            <p className="font-mono text-sm font-semibold text-emerald-900">{reservation?.referenceNo ?? refFallback}</p>
            {reservation ? (
              <p className="inline-flex items-center gap-1.5 pt-1 text-emerald-800">
                <CalendarDays size={14} aria-hidden />
                {reservation.checkInDate} → {reservation.checkOutDate}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="text-xs text-zinc-500">
          {isProcessing
            ? "Please wait a moment and refresh this page if confirmation is still processing."
            : "A confirmation email has been sent to your registered address. The remaining balance is payable directly at the resort upon check-in."}
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            data-booking-payment-primary="true"
            onClick={onClose}
            className="dash-btn-primary w-full justify-center px-4 py-2.5"
          >
            View list below
          </button>
          <Link
            href={secondaryHref}
            className="dash-btn-sm inline-flex w-full items-center justify-center gap-2 border border-softBorder bg-softCard px-4 py-2.5 font-semibold text-navy shadow-dash-btn-sm hover:bg-softGray"
          >
            <LayoutDashboard size={15} aria-hidden />
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </DashModal>
  );
}
