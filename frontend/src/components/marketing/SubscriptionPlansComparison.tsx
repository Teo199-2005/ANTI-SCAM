"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BusinessProVerifiedBadge } from "@/components/badges/BusinessProVerifiedBadge";
import { GoldBorderRibbon } from "@/components/marketing/GoldBorderRibbon";
import { Check, Shield, X } from "lucide-react";
import { formatPhp } from "@/lib/formatPhp";
import { PREMIUM_MARKETING_BORDER_CLASS } from "@/lib/marketingGoldRibbon";
import { businessProMonthlyPrice, SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";
import { cn } from "@/lib/utils";

const NAVY = "#0d1f3c";

const STANDARD_FEATURES = [
  "Resort verification process",
  "Verified resort listing",
  "Property management & calendar",
  "Dedicated booking website",
  "Up to 10 room slots",
  "Email & SMS notifications",
  "Guest booking dashboard",
  "Reservation management",
  "Online booking & GCash / Maya / cards",
  "Mobile-friendly resort page",
];

const STANDARD_LIMITATIONS = [
  "No analytics or revenue reporting",
  "No video on resort page",
  "No priority listing",
];

const PRO_FEATURES = [
  "Everything in Standard",
  "Up to 20 room slots",
  "Revenue & resort analytics",
  "Guest traffic & conversion reports",
  "YouTube intro video on your page",
  "Priority listing in search",
  "Premium Verified badge",
  "Downloadable reports",
  "Priority support",
  "Reward Growth Program eligibility",
];

type Props = {
  className?: string;
  compact?: boolean;
};

export function SubscriptionPlansComparison({ className, compact }: Props) {
  const proPrice = formatPhp(businessProMonthlyPrice());

  return (
    <div className={cn("mx-auto w-full max-w-[min(980px,100%)]", className)}>
      <div className={cn("grid gap-3 md:grid-cols-2 md:gap-4", compact && "gap-2 md:gap-3")}>
        <PlanCard
          compact={compact}
          title="Standard"
          badge={SUBSCRIPTION_PLANS.standard.badgeLabel}
          badgeIcon={Shield}
          priceLabel="FREE"
          priceSubtext="Forever for verified resorts"
          highlight={false}
          features={STANDARD_FEATURES}
          limitations={STANDARD_LIMITATIONS}
          ctaHref="/register?intent=owner"
          ctaLabel="Get verified — free"
        />
        <PlanCard
          compact={compact}
          title="Business Pro"
          badge={SUBSCRIPTION_PLANS.business_pro.badgeLabel}
          badgeLeading={<BusinessProVerifiedBadge size="xs" />}
          priceLabel={proPrice}
          priceSubtext="Per month · billed via Xendit"
          highlight
          features={PRO_FEATURES}
          ctaHref="/register?intent=owner"
          ctaLabel="Register & upgrade"
          ribbon="Recommended"
        />
      </div>
    </div>
  );
}

type PlanCardProps = {
  compact?: boolean;
  title: string;
  badge: string;
  badgeIcon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  badgeLeading?: ReactNode;
  priceLabel: string;
  priceSubtext: string;
  highlight: boolean;
  features: string[];
  limitations?: string[];
  ctaHref: string;
  ctaLabel: string;
  ribbon?: string;
};

function PlanCard({
  compact,
  title,
  badge,
  badgeIcon: BadgeIcon,
  badgeLeading,
  priceLabel,
  priceSubtext,
  highlight,
  features,
  limitations,
  ctaHref,
  ctaLabel,
  ribbon,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-xl border-2",
        compact ? "p-3" : "p-3.5 sm:p-4",
        highlight ? PREMIUM_MARKETING_BORDER_CLASS : "border-slate-300 bg-white shadow-sm",
      )}
      style={highlight ? { backgroundColor: NAVY } : undefined}
    >
      {ribbon ? <GoldBorderRibbon label={ribbon} /> : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <p
          className={cn(
            "font-pop font-bold",
            compact ? "text-sm" : "text-base",
            highlight ? "text-white" : "text-[#0d1f3c]",
          )}
        >
          {title}
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-2 py-px text-[8px] font-bold uppercase tracking-wide sm:text-[9px]",
            highlight ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-300/30" : "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
          )}
        >
          {badgeLeading ?? (BadgeIcon ? <BadgeIcon className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" aria-hidden /> : null)}
          {badge}
        </span>
      </div>
      <div className={compact ? "mt-1.5" : "mt-2.5"}>
        <span
          className={cn("font-black leading-none", highlight ? "text-amber-300" : "text-[#0d1f3c]")}
          style={{ fontSize: compact ? (highlight ? "1.4rem" : "1.35rem") : highlight ? "1.65rem" : "1.5rem" }}
        >
          {priceLabel}
        </span>
        <p className={cn("mt-0.5 text-[10px] sm:text-[11px]", highlight ? "text-slate-400" : "text-zinc-500")}>{priceSubtext}</p>
      </div>
      <ul
        className={cn(
          "flex-1 grid grid-cols-2 gap-x-2",
          compact ? "mt-2 gap-y-1" : "mt-3 gap-y-1.5 sm:gap-x-3 sm:gap-y-2",
        )}
      >
        {features.map((f) => (
          <li
            key={f}
            className={cn(
              "flex items-start gap-1 leading-snug",
              compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]",
            )}
          >
            <Check
              className={cn("mt-px h-3 w-3 shrink-0", highlight ? "text-emerald-400" : "text-emerald-600")}
              aria-hidden
            />
            <span className={highlight ? "text-slate-200" : "text-zinc-700"}>{f}</span>
          </li>
        ))}
      </ul>
      {limitations && limitations.length > 0 ? (
        <ul
          className={cn(
            "grid grid-cols-2 gap-x-2 border-t border-dashed sm:gap-x-3",
            compact ? "mt-1.5 gap-y-1 pt-1.5" : "mt-2 gap-y-1.5 pt-2",
            highlight ? "border-white/15" : "border-zinc-200",
          )}
        >
          {limitations.map((l) => (
            <li
              key={l}
              className={cn(
                "flex items-start gap-1 leading-snug opacity-90",
                compact ? "text-[8px] sm:text-[9px]" : "text-[9px] sm:text-[10px]",
              )}
            >
              <X className="mt-px h-3 w-3 shrink-0 text-rose-400" aria-hidden />
              <span className={highlight ? "text-slate-400" : "text-zinc-500"}>{l}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={ctaHref}
        className={cn(
          "inline-flex w-full justify-center rounded-lg font-bold transition",
          compact ? "mt-2.5 py-1.5 text-[11px] sm:text-xs" : "mt-3.5 py-2 text-xs sm:text-[13px]",
          highlight
            ? "bg-gradient-to-b from-amber-300 to-amber-500 text-[#0d1f3c] shadow-md hover:brightness-105"
            : "border-2 border-[#0d1f3c] bg-white text-[#0d1f3c] hover:bg-zinc-50",
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
