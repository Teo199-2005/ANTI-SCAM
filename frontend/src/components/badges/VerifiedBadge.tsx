import {
  BusinessProVerifiedBadge,
  type BusinessProVerifiedBadgeSize,
} from "@/components/badges/BusinessProVerifiedBadge";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

type Props = {
  /** Business Pro / premium verified — shows gold verified.png; otherwise sky shield. */
  premium?: boolean;
  size?: BusinessProVerifiedBadgeSize;
  className?: string;
  /** Extra classes on the standard-plan shield icon. */
  standardIconClassName?: string;
};

/**
 * Resort trust mark: gold badge (verified.png) is exclusive to Premium Verified / Business Pro.
 * Standard verified resorts use a shield icon.
 */
export function VerifiedBadge({
  premium = false,
  size = "sm",
  className,
  standardIconClassName,
}: Props) {
  if (premium) {
    return <BusinessProVerifiedBadge size={size} className={className} />;
  }
  return (
    <ShieldCheck
      className={cn("h-3 w-3 shrink-0 text-sky-700", standardIconClassName, className)}
      aria-hidden
    />
  );
}
