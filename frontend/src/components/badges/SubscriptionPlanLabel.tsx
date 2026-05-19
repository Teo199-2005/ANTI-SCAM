import { BusinessProVerifiedBadge, type BusinessProVerifiedBadgeSize } from "@/components/badges/BusinessProVerifiedBadge";
import { normalizePlanId } from "@/lib/subscriptionPlans";
import { cn } from "@/lib/utils";

type Props = {
  plan?: string | null;
  className?: string;
  badgeSize?: BusinessProVerifiedBadgeSize;
};

/** Human-readable plan name with verified badge for Business Pro. */
export function SubscriptionPlanLabel({ plan, className, badgeSize = "xs" }: Props) {
  const id = normalizePlanId(plan);
  const label = id === "business_pro" ? "Business Pro" : "Standard";

  if (id === "business_pro") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <BusinessProVerifiedBadge size={badgeSize} />
        <span>{label}</span>
      </span>
    );
  }

  return <span className={className}>{label}</span>;
}
