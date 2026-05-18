import { Shield, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  badgeLabel?: string | null;
  isPremiumVerified?: boolean;
  className?: string;
};

export function ResortPlanBadge({ badgeLabel, isPremiumVerified, className }: Props) {
  if (!badgeLabel) return null;
  const premium = Boolean(isPremiumVerified);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        premium
          ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200/90"
          : "bg-sky-50 text-sky-900 ring-1 ring-sky-200/90",
        className,
      )}
    >
      {premium ? (
        <Star className="h-3 w-3 shrink-0 text-amber-600" aria-hidden />
      ) : (
        <Shield className="h-3 w-3 shrink-0 text-sky-700" aria-hidden />
      )}
      {badgeLabel}
    </span>
  );
}
