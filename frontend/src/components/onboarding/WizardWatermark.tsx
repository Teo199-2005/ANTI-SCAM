"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { cn } from "@/lib/utils";

export function WizardWatermark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 right-3 z-20 opacity-70 sm:bottom-4 sm:right-4",
        className,
      )}
      aria-hidden
    >
      <BrandWordmark tone="onLight" size="2xs" displayHeading subtitle className="items-end text-right" />
    </div>
  );
}
