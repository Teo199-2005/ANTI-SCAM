"use client";

import { MARKETING_MODAL_FRAME_CLASS, MARKETING_MODAL_Z } from "@/lib/marketingModalLayout";
import { cn } from "@/lib/utils";
import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  zIndexClass?: string;
  lockScroll?: boolean;
  /** When false, Escape does not close (e.g. blocking loaders). */
  escapeToClose?: boolean;
  /** When false, backdrop clicks do not close (e.g. required confirmations). */
  dismissOnBackdrop?: boolean;
  /**
   * `marketing` — inset below nav, safe areas, mobile bottom-align / desktop center.
   * `bare` — only wraps children (you supply layout).
   */
  layout?: "bare" | "marketing";
  /** Extra classes on the inner layout frame (marketing layout only). */
  frameClassName?: string;
};

export function useModalEscape(onClose: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, enabled]);
}

/**
 * Full-viewport modal shell: click backdrop to dismiss, optional scroll lock + Escape.
 * Wrap panel content in an element with `pointer-events-auto`.
 */
export function DismissibleModalShell({
  open,
  onClose,
  children,
  className,
  backdropClassName = "bg-zinc-950/65 backdrop-blur-[3px]",
  zIndexClass = MARKETING_MODAL_Z,
  lockScroll = true,
  escapeToClose = true,
  dismissOnBackdrop = true,
  layout = "marketing",
  frameClassName,
}: Props) {
  useModalEscape(onClose, open && escapeToClose);

  useEffect(() => {
    if (!open || !lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockScroll]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className={cn(
        "fixed inset-0 overflow-y-auto overflow-x-hidden overscroll-contain",
        zIndexClass,
        className,
      )}
    >
      {dismissOnBackdrop ? (
        <button
          type="button"
          className={cn("absolute inset-0 z-0 cursor-default", backdropClassName)}
          aria-label="Close dialog"
          onClick={onClose}
        />
      ) : (
        <div className={cn("absolute inset-0 z-0", backdropClassName)} aria-hidden />
      )}
      <div
        className={cn(
          "relative z-10 pointer-events-none",
          layout === "marketing"
            ? MARKETING_MODAL_FRAME_CLASS
            : cn("min-h-full w-full", frameClassName),
        )}
      >
        {children}
      </div>
    </div>
  );
}
