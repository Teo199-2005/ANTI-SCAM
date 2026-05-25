"use client";

import { BusinessProVerifiedBadge } from "@/components/badges/BusinessProVerifiedBadge";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { DismissibleModalShell } from "@/components/ui/DismissibleModalShell";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { MARKETING_MODAL_PANEL_MAX_H_LG, MARKETING_MODAL_Z_REGISTER } from "@/lib/marketingModalLayout";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  eligible?: boolean;
};

export function ResortGrowthRewardsProgramModal({ open, onClose, eligible = true }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <DismissibleModalShell
      open={open}
      onClose={onClose}
      zIndexClass={MARKETING_MODAL_Z_REGISTER}
      backdropClassName="bg-[#0d1f3c]/70 backdrop-blur-[2px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resort-growth-rewards-title"
        className={cn(
          "pointer-events-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_25px_50px_-12px_rgba(13,31,60,0.4)] ring-1 ring-black/5",
          MARKETING_MODAL_PANEL_MAX_H_LG,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-clTeal via-amber-400 to-clCoral" aria-hidden />

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-200/80">
              <BusinessProVerifiedBadge size="lg" />
            </div>
            <div className="min-w-0">
              <h2
                id="resort-growth-rewards-title"
                className="font-pop text-sm font-extrabold uppercase tracking-[0.06em] text-[#0B1F3A] sm:text-base"
              >
                Resort Growth Rewards Program
              </h2>
              <p className="text-[11px] text-zinc-500 sm:text-xs">Scroll to read the full details.</p>
            </div>
          </div>
          <ModalCloseButton onClose={onClose} className="shrink-0" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/80 p-2 sm:p-3">
          {eligible ? (
            <ImageWithFallback
              src="/marketing/program.png"
              alt="Anti-Scam PH Resort Growth Rewards Program"
              width={1600}
              height={2200}
              unoptimized
              className="mx-auto h-auto w-full max-w-full rounded-lg object-contain shadow-sm"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
          ) : (
            <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-amber-200/80 bg-white p-6 text-center shadow-sm">
              <p className="font-pop inline-flex items-center justify-center gap-2 text-base font-bold text-[#0B1F3A]">
                <BusinessProVerifiedBadge size="sm" />
                Business Pro exclusive
              </p>
              <p className="text-sm leading-relaxed text-zinc-600">
                The Resort Growth Rewards Program is available to Premium Verified Resorts on the Business Pro plan.
              </p>
              <Link
                href="/dashboard/resort"
                className="inline-flex rounded-full bg-[#0d1f3c] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-95"
                onClick={onClose}
              >
                Go to dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </DismissibleModalShell>,
    document.body,
  );
}
