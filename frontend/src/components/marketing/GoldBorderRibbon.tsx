import { MARKETING_GOLD_RIBBON_GRADIENT } from "@/lib/marketingGoldRibbon";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  className?: string;
};

/**
 * Centered pill sitting on the top border (same placement as “Recommended” on pricing).
 * Parent must be `position: relative` and not clip overflow (use `overflow-visible`).
 */
export function GoldBorderRibbon({ label, className }: Props) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute -top-2.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-px text-[9px] font-extrabold uppercase tracking-wider text-white sm:px-3 sm:py-0.5 sm:text-[10px]",
        className,
      )}
      style={{ background: MARKETING_GOLD_RIBBON_GRADIENT }}
    >
      {label}
    </span>
  );
}
