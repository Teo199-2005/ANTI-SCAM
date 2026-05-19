"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type Props = {
  onClose: () => void;
  className?: string;
  /** `dark` for hero / navy headers; `light` for white panels. */
  tone?: "light" | "dark";
  "aria-label"?: string;
};

/** Subtle minimalist close control for modals. */
export function ModalCloseButton({
  onClose,
  className,
  tone = "light",
  "aria-label": ariaLabel = "Close",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clOcean/35 focus-visible:ring-offset-1",
        tone === "dark"
          ? "border-white/20 bg-black/20 text-white/90 hover:bg-white/10"
          : "border-zinc-200/90 bg-white/95 text-zinc-500 shadow-sm hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800",
        className,
      )}
    >
      <X size={16} strokeWidth={2} aria-hidden />
    </button>
  );
}
