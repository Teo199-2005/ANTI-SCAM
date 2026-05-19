"use client";

import { formatPhp } from "@/lib/formatPhp";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

type Props = {
  feePaidPhp: number;
  balanceAtResortPhp: number;
  className?: string;
};

/** Post-checkout confirmation — slot secured with fee paid and balance reminder. */
export function BookingSlotSecuredPanel({ feePaidPhp, balanceAtResortPhp, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-white p-5 text-center shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500",
        className,
      )}
      role="status"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 motion-safe:animate-in motion-safe:zoom-in motion-safe:duration-700">
        <CheckCircle2 className="h-8 w-8" aria-hidden />
      </div>
      <h2 className="mt-3 font-heading text-lg font-semibold text-emerald-950">Your slot is secured</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Reservation fee paid: <span className="font-semibold text-zinc-900">{formatPhp(feePaidPhp)}</span>
      </p>
      <p className="mt-2 text-sm text-zinc-600">
        Balance due at the resort: <span className="font-semibold text-zinc-900">{formatPhp(balanceAtResortPhp)}</span>
      </p>
    </div>
  );
}
