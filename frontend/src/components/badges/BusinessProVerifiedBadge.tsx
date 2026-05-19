import { BUSINESS_PRO_VERIFIED_BADGE_SRC } from "@/lib/businessProBadge";
import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * Verified checkmark sized like Lucide icons beside labels (IG/FB proportions).
 * Regenerate asset: `node scripts/process-verified-badge.mjs`
 */
const SIZES = {
  /** ~10px — compact pills (8–10px label text) */
  xs: { slot: "h-2.5 w-2.5", px: 10 },
  /** ~12px — pills with 9–11px text */
  sm: { slot: "h-3 w-3", px: 12 },
  /** ~14px — hero chips, inline with 10–11px uppercase */
  md: { slot: "h-3.5 w-3.5", px: 14 },
  /** ~16px — nav / table rows */
  lg: { slot: "h-4 w-4", px: 16 },
  /** ~18px — stat cards, emphasis */
  xl: { slot: "h-[1.125rem] w-[1.125rem]", px: 18 },
  /** ~20px — modal header icon wells */
  "2xl": { slot: "h-5 w-5", px: 20 },
  /** ~24px — large standalone mark only */
  "3xl": { slot: "h-6 w-6", px: 24 },
} as const;

export type BusinessProVerifiedBadgeSize = keyof typeof SIZES;

type Props = {
  size?: BusinessProVerifiedBadgeSize;
  className?: string;
  decorative?: boolean;
};

export function BusinessProVerifiedBadge({
  size = "md",
  className,
  decorative = true,
}: Props) {
  const s = SIZES[size];

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", s.slot, className)}
      aria-hidden={decorative}
    >
      <Image
        src={BUSINESS_PRO_VERIFIED_BADGE_SRC}
        alt={decorative ? "" : "Business Pro verified"}
        width={s.px}
        height={s.px}
        unoptimized
        className="h-full w-full object-contain object-center drop-shadow-[0_0.5px_1px_rgba(0,0,0,0.15)]"
      />
    </span>
  );
}
