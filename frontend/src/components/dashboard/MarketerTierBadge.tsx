import { cn } from "@/lib/utils";
import { Gem } from "lucide-react";

const TIER_RING: Record<string, string> = {
  silver: "border-slate-300/90 bg-gradient-to-br from-slate-50 via-zinc-50 to-slate-100 text-slate-800 shadow-sm ring-1 ring-slate-200/90",
  gold: "border-amber-400/80 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/90 text-amber-950 shadow-sm ring-1 ring-amber-300/70",
  platinum:
    "border-violet-400/70 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-violet-100/80 text-violet-950 shadow-sm ring-1 ring-violet-300/60",
  emergency_flat: "border-zinc-400 bg-gradient-to-br from-zinc-100 to-zinc-50 text-zinc-900 ring-1 ring-zinc-300/80",
};

/** Higher sorts first when direction is `desc` (Platinum → none). */
export function marketerTierSortRank(tierKey: string | null | undefined): number {
  switch (tierKey) {
    case "platinum":
      return 3;
    case "gold":
      return 2;
    case "emergency_flat":
      return 2;
    case "silver":
      return 1;
    default:
      return 0;
  }
}

type MarketerTierBadgeProps = {
  tierKey: string | null | undefined;
  label?: string | null;
  size?: "sm" | "md";
  className?: string;
  showGem?: boolean;
  /** Light text for dark backgrounds (e.g. hero banners). */
  variant?: "default" | "onDark";
};

export default function MarketerTierBadge({
  tierKey,
  label,
  size = "sm",
  className,
  showGem = true,
  variant = "default",
}: MarketerTierBadgeProps) {
  const key = tierKey && TIER_RING[tierKey] ? tierKey : null;
  const display =
    label?.trim() ||
    (key === "silver" ? "Silver" : key === "gold" ? "Gold" : key === "platinum" ? "Platinum" : key === "emergency_flat" ? "Standard" : null);

  if (!key && !display) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
          variant === "onDark"
            ? "border-white/35 bg-white/10 text-white/90"
            : "border-zinc-200/90 bg-zinc-50 text-zinc-500",
          size === "md" && "px-2.5 py-1 text-xs",
          className,
        )}
      >
        No tier yet
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        size === "md" && "gap-1.5 px-2.5 py-1 text-xs",
        variant === "onDark"
          ? "border-white/40 bg-white/15 text-white ring-1 ring-white/25 shadow-none"
          : key
            ? TIER_RING[key]
            : "border-zinc-200 bg-zinc-50 text-zinc-700",
        className,
      )}
    >
      {showGem ? <Gem size={size === "md" ? 13 : 11} className="shrink-0 opacity-90" strokeWidth={2.2} aria-hidden /> : null}
      {display ?? "Tier"}
    </span>
  );
}
