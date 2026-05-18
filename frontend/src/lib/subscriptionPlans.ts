export const SUBSCRIPTION_PLANS = {
  standard: {
    id: "standard" as const,
    label: "Verified Resort",
    badgeLabel: "Verified Resort",
    maxRooms: 10,
    monthlyPricePhp: 0,
  },
  business_pro: {
    id: "business_pro" as const,
    label: "Premium Verified Resort",
    badgeLabel: "Premium Verified Resort",
    maxRooms: 20,
    monthlyPricePhp: 1000,
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;

export function normalizePlanId(plan: string | null | undefined): SubscriptionPlanId {
  const p = (plan ?? "standard").toLowerCase();
  if (p === "business_pro" || p === "premium" || p === "vip" || p === "pro") {
    return "business_pro";
  }
  return "standard";
}

export function isBusinessProPlan(plan: string | null | undefined, status: string | null | undefined): boolean {
  return (
    normalizePlanId(plan) === "business_pro" &&
    ["active", "grace_period"].includes((status ?? "").toLowerCase())
  );
}

export function businessProMonthlyPrice(): number {
  if (process.env.NEXT_PUBLIC_PRICING_PILOT_MODE === "true") {
    const n = Number(process.env.NEXT_PUBLIC_PRICING_PILOT_AMOUNT ?? "1");
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  return SUBSCRIPTION_PLANS.business_pro.monthlyPricePhp;
}
