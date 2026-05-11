"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import type { MarketerTierInfo, TierLadderEntry } from "@/lib/api/marketing";
import MarketerTierBadge from "@/components/dashboard/MarketerTierBadge";
import { cn } from "@/lib/utils";
import { ShieldCheck, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type MarketingTiersInfoModalProps = {
  open: boolean;
  onClose: () => void;
  tierLadder: TierLadderEntry[];
  tierPolicy: string;
  marketerTier: MarketerTierInfo | null;
  convertingResortsCount: number;
  loading?: boolean;
  title?: string;
};

function fmtPhp(n: number) {
  return `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function MarketingTiersInfoModal({
  open,
  onClose,
  tierLadder,
  tierPolicy,
  marketerTier,
  convertingResortsCount,
  loading,
  title = "Partner tier program",
}: MarketingTiersInfoModalProps) {
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
      className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={cn(
          "max-h-[min(92dvh,720px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/20 bg-white shadow-[0_24px_80px_rgba(13,30,66,0.35)] sm:rounded-2xl",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tiers-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-softBorder bg-gradient-to-r from-navy/95 via-primaryBlue to-slateBlue px-4 py-3 text-white sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="inline-flex flex-wrap items-center gap-1.5 text-white/85">
              <ShieldCheck size={14} className="shrink-0" aria-hidden />
              <BrandWordmark tone="onDark" size="2xs" className="leading-none" />
            </p>
            <h2 id="tiers-modal-title" className="mt-1 font-dash text-lg font-bold leading-snug sm:text-xl">
              {title}
            </h2>
            <p className="mt-1 text-xs text-white/85">
              Transparent, count-based rates for subscription referral commissions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          {loading ? (
            <p className="text-sm text-zinc-600">Loading tier details…</p>
          ) : (
            <>
              <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/80 to-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900/80">Your status</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <MarketerTierBadge
                    tierKey={marketerTier?.tierKey}
                    label={marketerTier?.label}
                    size="md"
                  />
                  <span className="text-sm text-zinc-700">
                    <strong className="tabular-nums text-navy">{convertingResortsCount}</strong> converting{" "}
                    {convertingResortsCount === 1 ? "resort" : "resorts"}
                  </span>
                </div>
                {marketerTier ? (
                  <p className="mt-2 text-sm text-zinc-700">
                    Current commission credit per qualifying paid subscription:{" "}
                    <strong className="text-navy">{fmtPhp(marketerTier.perPaymentPhp)}</strong>
                    {marketerTier.clientsToNextTier != null && marketerTier.nextTierAt != null ? (
                      <span className="block pt-1 text-xs text-zinc-600">
                        {marketerTier.clientsToNextTier > 0 ? (
                          <>
                            Add <strong>{marketerTier.clientsToNextTier}</strong> more converting{" "}
                            {marketerTier.clientsToNextTier === 1 ? "resort" : "resorts"} to reach the next tier (at{" "}
                            {marketerTier.nextTierAt}).
                          </>
                        ) : (
                          <>You are at the threshold for the next tier.</>
                        )}
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-zinc-700">
                    Earn your first tier when at least one resort you referred has a paid qualifying platform subscription
                    invoice. Room add-on-only payments do not count.
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Tier ladder</p>
                <div className="mt-2 overflow-hidden rounded-xl border border-softBorder">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-softCard text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">Tier</th>
                        <th className="px-3 py-2">Converting resorts</th>
                        <th className="px-3 py-2 text-right">Per paid credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-softBorder bg-white">
                      {tierLadder.map((row) => (
                        <tr key={row.tierKey} className="text-zinc-800">
                          <td className="px-3 py-2.5">
                            <MarketerTierBadge tierKey={row.tierKey} label={row.label} size="sm" />
                          </td>
                          <td className="px-3 py-2.5 font-medium tabular-nums text-zinc-700">{row.clientRangeLabel}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-navy">{fmtPhp(row.perPaymentPhp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {tierPolicy ? (
                <div className="rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-3 text-xs leading-relaxed text-sky-950">
                  {tierPolicy}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
