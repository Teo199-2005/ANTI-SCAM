"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const sel = [
    'a[href]:not([disabled])',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  return Array.from(container.querySelectorAll<HTMLElement>(sel)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

export type DashModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** px-6 pb-6 on panel — set false for full-bleed content */
  padded?: boolean;
  className?: string;
  initialFocusSelector?: string;
};

/**
 * Dashboard modal shell — solid surfaces, focus trap, Escape, restore focus.
 * Forbidden: glass/backdrop-blur marketing panels here.
 */
export default function DashModal({
  open,
  onClose,
  title,
  description,
  children,
  padded = true,
  className,
  initialFocusSelector,
}: DashModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const prevActive = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open || !panelRef.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = getFocusableElements(panelRef.current);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    prevActive.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    const t = window.requestAnimationFrame(() => {
      const root = panelRef.current;
      if (!root) return;
      const preferred = initialFocusSelector
        ? root.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      const focusables = getFocusableElements(root);
      (preferred ?? focusables[0])?.focus();
    });

    return () => {
      window.cancelAnimationFrame(t);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      prevActive.current?.focus?.();
    };
  }, [open, handleKeyDown, initialFocusSelector]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-900/45 p-0 motion-safe:transition-opacity motion-safe:duration-150 md:items-center md:p-4"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "w-full max-w-2xl overflow-y-auto border border-white/55 bg-gradient-to-b from-softCard to-metalFace shadow-metallic-panel outline-none ring-1 ring-black/[0.04] motion-safe:transition-transform motion-safe:duration-200 motion-reduce:transition-none",
          "max-h-[min(88dvh,900px)] max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
          "md:max-h-[min(90vh,720px)] md:rounded-2xl md:pb-0",
          className
        )}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-softBorder px-dash-6 py-dash-4">
          <div className="min-w-0">
            <div id={titleId} role="heading" aria-level={2} className="font-dash text-dash-xl font-semibold text-navy">
              {title}
            </div>
            {description ? (
              <p id={descId} className="mt-1 text-dash-sm text-zinc-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-softBorder bg-softCard text-zinc-500 shadow-dash-btn-sm transition hover:border-zinc-300 hover:bg-softGray hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryBlue focus-visible:ring-offset-2 md:h-9 md:w-9 md:min-h-0 md:min-w-0"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <div className={cn(padded && "px-dash-6 pb-dash-6 pt-dash-4")}>{children}</div>
      </div>
    </div>
  , document.body);
}
