"use client";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/ToastProvider";
import { getReservation, cancelReservation, ReservationDetail, createPaymentInvoice } from "@/lib/api/payment";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { BadgeCheck, CalendarDays, ChevronLeft, CreditCard, Printer, XCircle } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getReservation(id);
        setReservation(data);
      } catch (err) {
        setError("Booking not found or access denied.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const onCancel = async () => {
    if (!reservation) return;
    setCancelling(true);
    setCancelMsg(null);
    try {
      const updated = await cancelReservation(id);
      setReservation(updated);
      setCancelMsg("Booking cancelled successfully.");
      pushToast({ title: "Booking cancelled", tone: "success" });
    } catch (err) {
      const detail = parseApiErrorMessage(err, "Could not cancel this booking.");
      setCancelMsg(detail);
      pushToast({ title: "Could not cancel", description: detail, tone: "error" });
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const onPayNow = async () => {
    if (!reservation) return;
    try {
      const invoice = await createPaymentInvoice(reservation.id);
      if (invoice.already_confirmed) {
        pushToast({ title: "Payment recorded", description: "Your booking is confirmed.", tone: "success" });
        const data = await getReservation(id);
        setReservation(data);
        return;
      }
      if (invoice.invoice_url) {
        window.location.href = invoice.invoice_url;
        return;
      }
      pushToast({ title: "Checkout unavailable", description: "No payment URL returned. Try again or contact support.", tone: "error" });
    } catch (err) {
      pushToast({
        title: "Payment could not start",
        description: parseApiErrorMessage(err, "Try again in a moment or contact the resort for help."),
        tone: "error",
      });
    }
  };

  if (loading) {
    return <div className="dash-card p-10 text-center text-zinc-600">Loading booking…</div>;
  }

  if (error || !reservation) {
    return (
      <div className="dash-card border-rose-200/80 bg-rose-50/90 p-10 text-center text-rose-800">{error ?? "Not found."}</div>
    );
  }

  const canCancel = ["pending_payment", "confirmed"].includes(reservation.status);
  const nights = Math.max(
    0,
    (new Date(reservation.checkOutDate).getTime() - new Date(reservation.checkInDate).getTime()) / 86400000
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/client/bookings" className="dash-btn-sm">
          <ChevronLeft size={14} />
          Back
        </Link>
        <h1 className="dash-page-title">Booking detail</h1>
        <div className="ml-auto">
          <Link href={`/dashboard/client/receipt?id=${id}`} className="dash-btn-sm">
            <Printer size={13} /> View Receipt
          </Link>
        </div>
      </div>

      {reservation.status === "pending_payment" ? (
        <div className="dash-card border-2 border-amber-300 bg-amber-50/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-800">Payment required</p>
              <p className="mt-1 font-dash text-lg font-semibold text-navy">Complete payment to confirm this booking</p>
              <p className="mt-1 text-sm text-zinc-700">Reference {reservation.referenceNo}</p>
            </div>
            <button
              type="button"
              onClick={() => void onPayNow()}
              className="dash-btn-primary bg-amber-600 hover:bg-amber-700"
            >
              Pay now
            </button>
          </div>
        </div>
      ) : null}

      <div className="dash-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-600">Reference number</p>
            <p className="font-mono text-2xl font-bold text-navy">{reservation.referenceNo}</p>
            {reservation.resort ? (
              <div className="mt-3 rounded-xl border border-softBorder bg-softGray/50 p-4">
                <p className="text-sm font-semibold text-navy">{reservation.resort.name}</p>
                {reservation.resort.address ? <p className="text-xs text-zinc-600">{reservation.resort.address}</p> : null}
                <Link href={`/dashboard/client/explore/${reservation.resort.id}`} className="mt-2 inline-block text-sm font-medium text-skyBlue hover:underline">
                  View resort in Explore →
                </Link>
              </div>
            ) : null}
            {reservation.room ? (
              <p className="mt-3 text-sm text-zinc-700">
                Room: <span className="font-medium text-navy">{reservation.room.name}</span>
              </p>
            ) : null}
          </div>
          <span className={statusBadge[reservation.status] ?? "dash-badge-slate"}>
            {reservation.status === "confirmed" ? <BadgeCheck size={14} /> : <XCircle size={14} />}
            {reservation.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="dash-card p-6">
          <h2 className="mb-4 font-dash text-xl text-navy">
            <CalendarDays size={16} className="mr-2 inline text-skyBlue" />
            Stay details
          </h2>
          <div className="space-y-2 text-sm text-zinc-700">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Check-in</span>
              <span className="font-medium text-zinc-900">{reservation.checkInDate}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Check-out</span>
              <span className="font-medium text-zinc-900">{reservation.checkOutDate}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Nights</span>
              <span className="font-medium text-zinc-900">{nights}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Guests</span>
              <span className="font-medium text-zinc-900">{reservation.guestCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Reserved at</span>
              <span className="text-right font-medium text-zinc-900">{new Date(reservation.reservedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="dash-card p-6">
          <h2 className="mb-4 font-dash text-xl text-navy">
            <CreditCard size={16} className="mr-2 inline text-skyBlue" />
            Payment
          </h2>
          <div className="space-y-2 text-sm text-zinc-700">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Reservation fee</span>
              <span className="font-semibold text-emerald-700">₱{Number(reservation.reservationFee).toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Total (incl. balance)</span>
              <span className="font-medium text-zinc-900">₱{Number(reservation.totalAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Payment status</span>
              <span className="capitalize text-zinc-900">{reservation.xenditPaymentStatus}</span>
            </div>
            {reservation.refundStatus ? (
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Refund</span>
                <span className="capitalize text-zinc-900">{reservation.refundStatus.replaceAll("_", " ")}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {reservation.cancellationReason ? (
        <div className="dash-card border-rose-200/80 bg-rose-50/90 p-5 text-sm text-rose-900">
          <p className="font-semibold text-navy">Cancellation reason</p>
          <p className="mt-1 text-rose-800">{reservation.cancellationReason}</p>
        </div>
      ) : null}

      {cancelMsg ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            cancelMsg.includes("successfully")
              ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-900"
              : "border-rose-200/80 bg-rose-50/90 text-rose-800"
          }`}
        >
          {cancelMsg}
        </div>
      ) : null}

      {canCancel ? (
        <div className="dash-card p-5">
          <h3 className="mb-2 font-semibold text-navy">Cancel booking</h3>
          <p className="mb-4 text-sm text-zinc-600">
            Cancellation is only allowed at least 24 hours before check-in. The ₱500 reservation fee is non-refundable.
          </p>
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            disabled={cancelling}
            className="dash-btn-danger disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Cancel booking"}
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel booking?"
        description="Cancellation is only allowed at least 24 hours before check-in. The reservation fee is non-refundable."
        confirmLabel="Cancel booking"
        tone="danger"
        loading={cancelling}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => void onCancel()}
      />
    </div>
  );
}
