"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import DashCard from "@/components/dash/DashCard";
import { apiClient } from "@/lib/api/client";
import { BadgeCheck, CalendarDays, CreditCard, Printer } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { formatPhp } from "@/lib/formatPhp";
import { useSearchParams } from "next/navigation";

type Reservation = {
  id: number;
  reference_no: string;
  acknowledgment_receipt_no: string | null;
  status: string;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  reservation_fee: number;
  total_amount: number;
  reserved_at: string | null;
  xendit_payment_status: string | null;
  room?: { id: number; name: string };
  resort?: { id: number; name: string; address: string | null };
};

type ApiEnvelope<T> = { success: boolean; data: T };

type ReservationApi = Reservation & {
  referenceNo?: string;
  acknowledgmentReceiptNo?: string | null;
  checkInDate?: string;
  checkOutDate?: string;
  guestCount?: number;
  reservationFee?: number;
  totalAmount?: number;
  reservedAt?: string | null;
  xenditPaymentStatus?: string | null;
};

function normalizeReservation(raw: ReservationApi): Reservation {
  return {
    id: raw.id,
    reference_no: raw.reference_no ?? raw.referenceNo ?? "",
    acknowledgment_receipt_no:
      raw.acknowledgment_receipt_no ?? raw.acknowledgmentReceiptNo ?? null,
    status: raw.status,
    check_in_date: raw.check_in_date ?? raw.checkInDate ?? "",
    check_out_date: raw.check_out_date ?? raw.checkOutDate ?? "",
    guest_count: raw.guest_count ?? raw.guestCount ?? 0,
    reservation_fee: raw.reservation_fee ?? raw.reservationFee ?? 0,
    total_amount: raw.total_amount ?? raw.totalAmount ?? 0,
    reserved_at: raw.reserved_at ?? raw.reservedAt ?? null,
    xendit_payment_status: raw.xendit_payment_status ?? raw.xenditPaymentStatus ?? null,
    room: raw.room,
    resort: raw.resort,
  };
}

function ReceiptContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No reservation ID provided.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await apiClient.get<ApiEnvelope<ReservationApi>>(`/reservations/${id}`);
        if (!cancelled) setReservation(normalizeReservation(data.data));
      } catch {
        if (!cancelled) setError("Reservation not found or access denied.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="dash-card p-10 text-center text-zinc-500">Loading receipt…</div>;
  if (error || !reservation) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center text-rose-800">{error}</div>;

  const balance = Number(reservation.total_amount) - Number(reservation.reservation_fee);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="dash-page-title flex items-center gap-2">
          <CreditCard size={22} className="text-skyBlue" /> Digital acknowledgment receipt
        </h1>
        <div className="flex gap-2">
          <button className="dash-btn-sm" onClick={() => window.print()}>
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      <DashCard id="receipt-content" className="p-8">
        {/* Header */}
        <div className="border-b border-softBorder pb-6 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-emerald-100 p-3 mb-3">
            <BadgeCheck size={24} className="text-emerald-600" />
          </div>
          <h2 className="font-dash text-2xl font-bold text-navy">Booking confirmed</h2>
          <div className="mt-1 flex justify-center">
            <BrandWordmark tone="onLight" size="xs" />
          </div>
        </div>

        {/* Digital acknowledgment receipt no. */}
        {reservation.acknowledgment_receipt_no ? (
          <div className="my-6 rounded-xl border border-clOcean/25 bg-sky-50/80 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-clOcean">Digital acknowledgment receipt</p>
            <p className="mt-1 font-mono text-xl font-bold text-navy sm:text-2xl">{reservation.acknowledgment_receipt_no}</p>
            <p className="mt-2 text-[11px] leading-snug text-zinc-500">
              Official Anti-Scam PH receipt for the platform reservation fee (non-refundable).
            </p>
          </div>
        ) : null}

        {/* Booking reference */}
        <div className="my-6 rounded-xl bg-softGray p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Reservation reference</p>
          <p className="mt-1 font-mono text-2xl font-bold text-navy">{reservation.reference_no}</p>
        </div>

        {/* Resort + Room */}
        {reservation.resort ? (
          <div className="mb-4 flex items-start gap-3">
            <div className="inline-flex rounded-lg bg-softGray p-2"><CalendarDays size={16} className="text-slateBlue" /></div>
            <div>
              <p className="font-semibold text-navy">{reservation.resort.name}</p>
              {reservation.resort.address ? <p className="text-xs text-zinc-400">{reservation.resort.address}</p> : null}
              {reservation.room ? <p className="text-xs text-zinc-500 mt-0.5">Room: {reservation.room.name}</p> : null}
            </div>
          </div>
        ) : null}

        {/* Details table */}
        <div className="space-y-2">
          {[
            { label: "Check-in",       value: reservation.check_in_date },
            { label: "Check-out",      value: reservation.check_out_date },
            { label: "Guests",         value: String(reservation.guest_count) },
            { label: "Booked on",      value: reservation.reserved_at ? new Date(reservation.reserved_at).toLocaleString() : "—" },
            { label: "Payment status", value: (reservation.xendit_payment_status ?? "—").toUpperCase() },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between border-b border-softBorder py-2 text-sm">
              <span className="text-zinc-500">{label}</span>
              <span className="font-medium text-navy">{value}</span>
            </div>
          ))}
        </div>

        {/* Amount breakdown */}
        <div className="mt-6 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">Reservation fee paid (non-refundable)</span>
            <span className="font-bold text-emerald-700">{formatPhp(Number(reservation.reservation_fee))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">Remaining balance (pay at resort)</span>
            <span className="font-bold text-orange-600">{formatPhp(balance)}</span>
          </div>
          <div className="flex justify-between border-t border-emerald-200 pt-2 text-base font-bold">
            <span className="text-navy">Total booking amount</span>
            <span className="text-navy">{formatPhp(Number(reservation.total_amount))}</span>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          The {formatPhp(Number(reservation.reservation_fee))} reservation fee is non-refundable. The remaining balance of{" "}
          {formatPhp(balance)} is payable directly at the resort upon check-in.
        </p>
      </DashCard>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div className="dash-card p-10 text-center text-zinc-500">Loading…</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
