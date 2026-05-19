import { GoldBorderRibbon } from "@/components/marketing/GoldBorderRibbon";
import { MARKETING_GOLD, MARKETING_GOLD_RIBBON_GRADIENT } from "@/lib/marketingGoldRibbon";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /**
   * `border` — on card/modal top edge (pricing “Recommended” style).
   * `pill` — inline floating badge for headers.
   */
  variant?: "border" | "pill";
};

/** Gold label for Business Pro / premium verified resorts in the public catalog. */
export function PremiumHighlyRecommendedRibbon({ className, variant = "border" }: Props) {
  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border-2 border-amber-400/95 px-3 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-amber-950 shadow-[0_2px_10px_rgba(180,110,0,0.22)] sm:text-[10px]",
          className,
        )}
        style={{
          background: `linear-gradient(165deg, #fff8e6 0%, #ffe9a8 45%, ${MARKETING_GOLD} 100%)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65), 0 2px 10px rgba(180,110,0,0.2)",
        }}
      >
        Highly Recommended
      </span>
    );
  }

  return <GoldBorderRibbon label="Highly Recommended" className={className} />;
}
