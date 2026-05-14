"use client";

import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { Gift, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Full-width marketing modal for the Resort Growth Rewards Program infographic (`/program.png`).
 */
export function ResortGrowthRewardsProgramModal({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[620] overflow-y-auto overflow-x-hidden overscroll-contain"
      role="presentation"
    >
      <div className="relative flex min-h-[100dvh] items-start justify-center px-3 py-6 sm:px-5 sm:py-10">
        <button
          type="button"
          className="absolute inset-0 min-h-full bg-[#0d1f3c]/70 backdrop-blur-[2px] transition-opacity"
          aria-label="Close dialog"
          onClick={onClose}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resort-growth-rewards-title"
          className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_25px_50px_-12px_rgba(13,31,60,0.4)] ring-1 ring-black/5"
        >
          <div className="h-1 w-full bg-gradient-to-r from-clTeal via-amber-400 to-clCoral" aria-hidden />

          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-200/80">
                <Gift className="h-5 w-5 text-amber-600" aria-hidden />
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
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[min(85dvh,calc(100dvh-7rem))] overflow-y-auto bg-zinc-50/80 p-2 sm:p-3">
            <ImageWithFallback
              src="/program.png"
              alt="Anti-Scam PH Resort Growth Rewards Program — prizes, how it works, eligibility, and contact information"
              width={1600}
              height={2200}
              unoptimized
              className="mx-auto h-auto w-full max-w-full rounded-lg object-contain shadow-sm"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
