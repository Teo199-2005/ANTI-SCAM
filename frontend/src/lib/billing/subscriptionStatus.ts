import { isBusinessProPlan, normalizePlanId } from "@/lib/subscriptionPlans";

/** DB stores unpaid legacy signups as `expired`; product copy uses "Inactive". */
export function formatSubscriptionStatusLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "expired") {
    return "Inactive";
  }
  if (normalized === "grace_period") {
    return "Grace period";
  }
  return normalized.replaceAll("_", " ");
}

export function formatOwnerConsoleStatusLabel(
  status: string,
  hasActiveReferralTrial: boolean,
  plan?: string | null,
): string {
  if (isBusinessProPlan(plan, status)) {
    return status === "grace_period" ? "Business Pro · grace" : "Business Pro";
  }

  if (hasActiveReferralTrial) {
    return "Business Pro trial";
  }

  if (status === "expired") {
    return "Inactive";
  }

  if (normalizePlanId(plan) === "standard" && status === "active") {
    return "Standard (free)";
  }

  return formatSubscriptionStatusLabel(status);
}

export function planBadgeLabel(plan: string | null | undefined, status: string | null | undefined): string {
  if (isBusinessProPlan(plan, status)) {
    return "Premium Verified Resort";
  }
  return "Verified Resort";
}
