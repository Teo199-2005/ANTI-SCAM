"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { WIZARD_MODAL_MAX_W, WIZARD_MODAL_Z } from "@/lib/marketingModalLayout";
import { cn } from "@/lib/utils";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Centered dashboard overlay for required registration.
 * Dashboard stays visible but softly dimmed (lower opacity + brightness).
 */
export function ResortRegistrationWizardModal({ open = true, children, className }: Props) {
  const hydrated = useHydrated();

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [open]);

  if (!open || !hydrated) return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 flex flex-col overflow-hidden overscroll-none", WIZARD_MODAL_Z)}
      role="presentation"
      aria-hidden={false}
    >
      {/* Soft dim: dashboard visible but de-emphasized behind the modal */}
      <div
        className="absolute inset-0 z-0 pointer-events-auto bg-[#0d1f3c]/25 backdrop-brightness-[0.62] backdrop-saturate-[0.88]"
        aria-hidden
      />

      <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden p-3 sm:p-5 md:p-6 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto mx-auto flex w-full flex-col",
            WIZARD_MODAL_MAX_W,
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
