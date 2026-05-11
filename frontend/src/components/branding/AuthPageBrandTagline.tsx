import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

/**
 * Shared trust line under login / register / forgot-password forms.
 */
export function AuthPageBrandTagline({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mt-6 flex items-center justify-center gap-2 border-t border-zinc-100/90 pt-5 text-center md:mt-4 md:pt-3",
        className,
      )}
    >
      <Shield size={14} className="shrink-0 text-clOcean/50" aria-hidden />
      <span className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug text-zinc-500">
        <BrandWordmark tone="onLight" size="xs" className="inline" />
        <span className="font-nav font-semibold text-zinc-400" aria-hidden>
          ·
        </span>
        <span className="font-nav text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Verified-safe bookings
        </span>
      </span>
    </div>
  );
}
