"use client";

import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { DismissibleModalShell } from "@/components/ui/DismissibleModalShell";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { MARKETING_MODAL_PANEL_MAX_H_MD, MARKETING_MODAL_Z_REGISTER } from "@/lib/marketingModalLayout";
import { cn } from "@/lib/utils";
import { BusinessProVerifiedBadge } from "@/components/badges/BusinessProVerifiedBadge";
import { BadgeCheck, Shield, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const WORDMARK_NAVY = "#0B1F3A";
const SCAM_ALERT_RED = "#E53935";
const GOLD = "#f5a623";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function VerifyResortComingSoonModal({ open, onClose }: Props) {
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
      backdropClassName="bg-[#0d1f3c]/65 backdrop-blur-[3px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-resort-soon-title"
        className={cn(
          "pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_25px_50px_-12px_rgba(13,31,60,0.35)] ring-1 ring-black/5",
          MARKETING_MODAL_PANEL_MAX_H_MD,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-clTeal via-amber-400 to-clCoral" aria-hidden />

        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <ImageWithFallback
                src="/branding/mainlogo.png"
                alt="Anti-Scam PH"
                width={56}
                height={56}
                className="h-full w-full object-contain p-1.5"
                sizes="56px"
              />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="font-pop text-[11px] font-extrabold uppercase tracking-[0.12em] sm:text-xs">
                <span style={{ color: WORDMARK_NAVY }}>ANTI-</span>
                <span style={{ color: SCAM_ALERT_RED }}>SCAM</span>
                <span style={{ color: WORDMARK_NAVY }}> PH</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Verify Resort</p>
            </div>
          </div>
          <ModalCloseButton onClose={onClose} className="shrink-0" />
        </div>

        <div className="space-y-4 overflow-y-auto bg-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-clTeal/25 bg-clTeal/10 px-3 py-1.5 text-clTeal">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Coming soon</span>
          </div>
          <h2
            id="verify-resort-soon-title"
            className="font-heading text-xl font-bold leading-snug tracking-tight text-[#0d1f3c] sm:text-2xl"
          >
            Public resort verification is on the way
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            We are finishing a guest-facing tool to look up verified Anti-Scam PH resorts. Until then, resorts onboard
            through <span className="font-semibold text-[#0d1f3c]">Register Your Resort</span> and our verification
            team.
          </p>
          <ul className="flex flex-wrap gap-2">
            <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#0d1f3c]">
              <BusinessProVerifiedBadge size="sm" />
              Premium verified badge
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#0d1f3c]">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} aria-hidden />
              Legitimacy checks
            </li>
          </ul>
        </div>
      </div>
    </DismissibleModalShell>,
    document.body,
  );
}



