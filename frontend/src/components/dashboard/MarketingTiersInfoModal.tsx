"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { formatPhp } from "@/lib/formatPhp";
import { marketingCommissionPolicySections } from "@/lib/marketingCommissionCopy";
import { cn } from "@/lib/utils";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { BedDouble, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

type MarketingTiersInfoModalProps = {
  open: boolean;
  onClose: () => void;
  commissionPerBookingPhp: number;
  usesCustomBookingCommission?: boolean;
  platformDefaultBookingCommissionPhp?: number;
  qualifyingBookingsCount: number;
  qualifyingBookingsMtd: number;
  pendingCommissionsGross?: number;
  pendingPayoutNetEstimate?: number;
  payoutWithholdingRate?: number;
  commissionPayoutSchedule?: string | null;
  loading?: boolean;
  title?: string;
};

export default function MarketingTiersInfoModal({
  open,
  onClose,
  commissionPerBookingPhp,
  usesCustomBookingCommission = false,
  platformDefaultBookingCommissionPhp = 10,
  qualifyingBookingsCount,
  qualifyingBookingsMtd,
  pendingCommissionsGross = 0,
  pendingPayoutNetEstimate = 0,
  payoutWithholdingRate = 0.1,
  commissionPayoutSchedule,
  loading,
  title = "Booking commission program",
}: MarketingTiersInfoModalProps) {
  const policy = useMemo(
    () => marketingCommissionPolicySections(commissionPerBookingPhp),
    [commissionPerBookingPhp],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-navy/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-commission-modal-title"
        className={cn(
          "relative z-10 flex max-h-[min(92vh,720px)] w-full flex-col overflow-hidden rounded-t-2xl border border-softBorder bg-white shadow-2xl",
          "sm:max-w-lg sm:rounded-2xl",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-softBorder bg-gradient-to-r from-violet-50/90 to-white px-4 py-4 sm:px-5">
          <div>
            <BrandWordmark className="h-5 w-auto opacity-90" />
            <h2
              id="booking-commission-modal-title"
              className="mt-2 font-dash text-base font-bold text-navy sm:text-lg"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Earn on paid online guest bookings at your assigned resorts.
            </p>
          </div>
          <ModalCloseButton onClose={onClose} tone="dark" className="shrink-0" />
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {loading ? (
            <p className="text-sm text-zinc-600">Loading commission details…</p>
          ) : (
            <>
              <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/80 to-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900/80">Your earnings</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-900">
                    <BedDouble size={14} aria-hidden />
                    {formatPhp(commissionPerBookingPhp)} / booking
                  </span>
                  {usesCustomBookingCommission ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                      <Sparkles size={11} aria-hidden />
                      Custom rate
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Platform default {formatPhp(platformDefaultBookingCommissionPhp)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-zinc-700">
                  <strong className="tabular-nums text-navy">{qualifyingBookingsCount}</strong> lifetime ·{" "}
                  <strong className="tabular-nums text-navy">{qualifyingBookingsMtd}</strong> this month
                </p>
                <p className="mt-2 text-sm text-zinc-700">
                  Pending gross <strong className="text-navy">{formatPhp(pendingCommissionsGross)}</strong>
                  {pendingPayoutNetEstimate > 0 ? (
                    <>
                      {" "}
                      · Est. payout <strong className="text-navy">{formatPhp(pendingPayoutNetEstimate)}</strong> (
                      {Math.round(payoutWithholdingRate * 100)}% withholding)
                    </>
                  ) : null}
                </p>
                {usesCustomBookingCommission &&
                platformDefaultBookingCommissionPhp !== commissionPerBookingPhp ? (
                  <p className="mt-2 text-xs text-amber-900/90">
                    Your admin set a custom rate of {formatPhp(commissionPerBookingPhp)} (platform default is{" "}
                    {formatPhp(platformDefaultBookingCommissionPhp)}). New booking credits use your current rate.
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 text-xs leading-relaxed text-emerald-950">
                <p className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-emerald-900/90">
                  <ShieldCheck size={14} aria-hidden />
                  Qualifying booking
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Online guest booking at a resort assigned to you</li>
                  <li>Status confirmed and payment marked paid (Xendit)</li>
                  <li>Manual or unpaid bookings do not earn commission</li>
                  <li>
                    <strong className="text-emerald-950">{policy.qualifyingRateLine}</strong>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-3 text-xs leading-relaxed text-sky-950">
                <p className="font-semibold text-sky-950">How you earn</p>
                <ul className="mt-2 list-inside list-disc space-y-1.5">
                  <li>{policy.earnLine}</li>
                  <li>Manual bookings and unpaid checkouts do not qualify.</li>
                  <li>{policy.reversalLine}</li>
                  <li>{policy.payoutLine}</li>
                </ul>
              </div>

              {commissionPayoutSchedule ? (
                <p className="text-xs text-zinc-600">
                  <strong className="text-zinc-800">Payout schedule:</strong> {commissionPayoutSchedule}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
