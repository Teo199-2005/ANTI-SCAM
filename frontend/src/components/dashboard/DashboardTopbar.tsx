"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import { cancelSubscriptionRecurring, createSubscriptionInvoice } from "@/lib/api/subscription";
import { getOwnerLandingPage } from "@/lib/api/landingPage";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { getMarketingStats, type MarketingStats } from "@/lib/api/marketing";
import { formatRoleLabel } from "@/lib/utils";
import { formatPhpLedger } from "@/lib/formatPhp";
import { BrandWordmark } from "@/components/branding/BrandWordmark";
import MarketingTiersInfoModal from "@/components/dashboard/MarketingTiersInfoModal";
import { BusinessProVerifiedBadge } from "@/components/badges/BusinessProVerifiedBadge";
import { Award, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Loader2, LogOut, Menu, Shield, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatOwnerConsoleStatusLabel, planBadgeLabel } from "@/lib/billing/subscriptionStatus";
import { isXenditCheckoutUrl } from "@/lib/billing/xenditCheckout";
import { businessProMonthlyPrice, isBusinessProPlan, normalizePlanId } from "@/lib/subscriptionPlans";
import { pricingPilotEnabled, pricingPilotUnitPhp } from "@/lib/pricingPilot";
import { createPortal } from "react-dom";

function segmentLabel(segment: string): string {
  return segment.replaceAll("-", " ").replaceAll("_", " ");
}

function roleBadgeClass(role: string): string {
  if (role === "admin") return "bg-navy/10 text-navy ring-1 ring-navy/20";
  if (role === "resort_owner") return "bg-clOcean/10 text-clOcean ring-1 ring-clOcean/20";
  if (role === "marketing") return "bg-violet-50 text-violet-900 ring-1 ring-violet-200/80";
  if (role === "guest") return "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80";
  return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80";
}

function subscriptionDaysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null;
  try {
    const end = new Date(endsAt);
    const ms = end.getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function formatSubscriptionRemainingLabel(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

type DashboardTopbarProps = { onOpenMenu: () => void };
type OwnerSubscriptionInfo = {
  resortId: number | null;
  status: string | null;
  plan: string | null;
  endsAt: string | null;
  billingMode: "manual" | "auto_card" | null;
  renewalDurationMonths: number;
  recurringCancelledAt: string | null;
  nextDueDate: string | null;
};

const BUSINESS_PRO_FEATURES = [
  "Up to 20 room slots",
  "Revenue & analytics dashboards",
  "Video on your resort page",
  "Priority verified listing",
  "Downloadable reports",
  "Reward Growth Program eligibility",
] as const;

export default function DashboardTopbar({ onOpenMenu }: DashboardTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { pushToast } = useToast();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [subscribingNow, setSubscribingNow] = useState(false);
  const subscribeInFlightRef = useRef(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<OwnerSubscriptionInfo | null>(null);
  const [cancellingRecurring, setCancellingRecurring] = useState(false);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const [marketingTierModalOpen, setMarketingTierModalOpen] = useState(false);
  const [marketingStats, setMarketingStats] = useState<MarketingStats | null>(null);
  const [marketingStatsLoading, setMarketingStatsLoading] = useState(false);
  const crumbs = pathname.split("/").filter(Boolean).slice(1);
  const initials =
    user?.name
      ?.split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  const roleLabel = formatRoleLabel(user?.role);
  const ownerHasWorkspace = user?.role === "resort_owner" && user.tenant_id != null;
  const hasActiveReferralTrial = Boolean(user?.referral_trial?.active);
  const subscriptionStatus = (
    subscriptionInfo?.status ??
    (user?.role === "resort_owner" && ownerHasWorkspace ? "active" : "active")
  ).toLowerCase();
  const ownerPlan = normalizePlanId(subscriptionInfo?.plan);
  const isBusinessPro = isBusinessProPlan(subscriptionInfo?.plan, subscriptionStatus) || hasActiveReferralTrial;
  const isSubscribedOwner = user?.role === "resort_owner" && ownerHasWorkspace;
  const showUpgradeCta =
    user?.role === "resort_owner" && ownerHasWorkspace && !isBusinessPro;
  const ownerStatusLabel = formatOwnerConsoleStatusLabel(
    subscriptionStatus,
    hasActiveReferralTrial,
    subscriptionInfo?.plan,
  );
  const ownerBadgeLabel = planBadgeLabel(subscriptionInfo?.plan, subscriptionStatus);
  const isStandardFreeActive =
    ownerPlan === "standard" && subscriptionStatus === "active" && !hasActiveReferralTrial;
  const subscriptionEndsAt = isStandardFreeActive
    ? null
    : subscriptionInfo?.endsAt ?? (hasActiveReferralTrial ? (user?.referral_trial?.ends_at ?? null) : null);
  const formattedEndDate = subscriptionEndsAt
    ? new Date(subscriptionEndsAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "Not available";
  const subscriptionDaysLeft = subscriptionDaysRemaining(subscriptionEndsAt);
  const subscriptionRemainingLabel = formatSubscriptionRemainingLabel(subscriptionDaysLeft);
  const isPaidSubscriptionActive = isBusinessPro && subscriptionStatus === "active";
  const autoRenewalActive =
    subscriptionInfo?.billingMode === "auto_card" && !subscriptionInfo?.recurringCancelledAt;
  const renewalMonths = subscriptionInfo?.renewalDurationMonths ?? 1;
  const totalCharge = pricingPilotEnabled() ? pricingPilotUnitPhp() : businessProMonthlyPrice();
  const selectedDuration = 1 as const;
  const selectedOffer = { monthlyRate: totalCharge, listMonthlyRate: totalCharge };
  const STANDARD_OFFERS = [
    { duration: 1 as const, monthlyRate: totalCharge, listMonthlyRate: totalCharge, billingType: "Monthly" },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const openUpgrade = () => setShowSubscribeModal(true);
    window.addEventListener("subscription:open-upgrade", openUpgrade);
    return () => window.removeEventListener("subscription:open-upgrade", openUpgrade);
  }, []);

  useEffect(() => {
    if (user?.role !== "marketing") {
      setMarketingStats(null);
      return;
    }
    let cancelled = false;
    setMarketingStatsLoading(true);
    void getMarketingStats()
      .then((s) => {
        if (!cancelled) setMarketingStats(s);
      })
      .catch(() => {
        if (!cancelled) setMarketingStats(null);
      })
      .finally(() => {
        if (!cancelled) setMarketingStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!user || user.role !== "resort_owner") {
      setSubscriptionInfo(null);
      return;
    }

    const loadSubscription = () => {
      void getOwnerLandingPage()
        .then((landing) => {
          if (cancelled) return;
          setSubscriptionInfo({
            resortId: landing.resort_id ?? null,
            status: landing.subscription_status ?? null,
            plan: landing.subscription_plan ?? null,
            endsAt: landing.subscription_end_at ?? null,
            billingMode:
              landing.subscription_billing_mode === "auto_card" ? "auto_card" : "manual",
            renewalDurationMonths: landing.subscription_renewal_duration_months ?? 1,
            recurringCancelledAt: landing.subscription_recurring_cancelled_at ?? null,
            nextDueDate: landing.subscription_next_due_date ?? null,
          });
        })
        .catch(() => {
          if (cancelled) return;
          setSubscriptionInfo(null);
        });
    };

    loadSubscription();

    const onRefresh = () => loadSubscription();
    window.addEventListener("subscription:refresh", onRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("subscription:refresh", onRefresh);
    };
  }, [user]);

  useEffect(() => {
    if (!showSubscribeModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowSubscribeModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSubscribeModal]);

  const subscribeNow = async () => {
    if (!user || user.role !== "resort_owner") return;
    if (!ownerHasWorkspace) {
      pushToast({
        title: "Complete setup first",
        description: "Create your resort workspace on Profile before subscribing.",
        tone: "warning",
      });
      return;
    }
    if (subscribeInFlightRef.current) return;
    subscribeInFlightRef.current = true;
    setSubscribingNow(true);
    setShowSubscribeModal(false);
    try {
      const result = await createSubscriptionInvoice(
        false,
        undefined,
        undefined,
        "monthly",
        undefined,
        1,
        typeof window !== "undefined" ? window.location.origin : undefined,
      );
      const checkoutUrl = result.invoice_url?.trim() ?? "";
      if (!isXenditCheckoutUrl(checkoutUrl)) {
        throw new Error(
          "Payment gateway did not return a Xendit checkout link. Add your server IP to the Xendit API key allowlist, or use a development API key for local testing.",
        );
      }
      window.location.assign(checkoutUrl);
    } catch (err) {
      pushToast({
        title: "Unable to start payment",
        description: parseApiErrorMessage(err, "Please try again."),
        tone: "error",
      });
      setSubscribingNow(false);
      subscribeInFlightRef.current = false;
    }
  };

  const onCancelAutoRenewal = async () => {
    const resortId = subscriptionInfo?.resortId;
    if (!resortId) {
      pushToast({ title: "Resort not found", description: "Reload the page and try again.", tone: "error" });
      return;
    }
    if (
      !window.confirm(
        "Cancel auto-renewal? Your card will not be charged again after the current billing period. You can pay manually when your plan is due.",
      )
    ) {
      return;
    }
    setCancellingRecurring(true);
    try {
      await cancelSubscriptionRecurring(resortId);
      pushToast({
        title: "Auto-renewal cancelled",
        description: "You will receive invoices for manual renewal when your plan is due.",
        tone: "success",
      });
      window.dispatchEvent(new Event("subscription:refresh"));
    } catch (err) {
      pushToast({
        title: "Could not cancel auto-renewal",
        description: parseApiErrorMessage(err, "Please try again."),
        tone: "error",
      });
    } finally {
      setCancellingRecurring(false);
    }
  };

  return (
    <header className="dash-topbar sticky top-0 z-30 flex h-16 min-w-0 max-w-full shrink-0 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 lg:gap-4 lg:px-6 max-md:h-auto max-md:min-h-[3.25rem] max-md:py-2 max-md:pt-[max(0.35rem,env(safe-area-inset-top))] max-md:border-b max-md:border-white/65 max-md:bg-gradient-to-b max-md:from-white/92 max-md:via-softCard/96 max-md:to-metalFace/92 max-md:shadow-[0_6px_22px_-8px_rgba(13,30,66,0.18)] max-md:backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-softBorder bg-white/90 text-zinc-500 shadow-soft-sm transition-[transform,color,background-color,border-color,box-shadow] duration-150 hover:border-navy/20 hover:bg-navy/5 hover:text-navy active:scale-[0.96] [touch-action:manipulation] md:hidden md:h-9 md:w-9 md:min-h-0 md:min-w-0"
          onClick={onOpenMenu}
          aria-label="Open navigation"
        >
          <Menu size={16} />
        </button>

        {user?.role === "guest" && user?.home_resort?.name ? (
          <div className="min-w-0 flex-1 md:hidden">
            <p className="truncate font-pop text-sm font-extrabold uppercase leading-tight tracking-[0.05em] text-navy">
              {user.home_resort.name}
            </p>
            <BrandWordmark tone="onLight" size="2xs" className="mt-0.5 block leading-tight" />
          </div>
        ) : null}

        <nav
          aria-label="Breadcrumb"
          className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto font-dash text-dash-xs text-zinc-500 [-ms-overflow-style:none] [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden"
        >
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-lg border border-transparent px-2 py-1 transition-colors hover:border-navy/15 hover:bg-navy/5 hover:text-navy"
            >
              Dashboard
            </Link>
            {crumbs.map((crumb, idx) => {
              const href = `/${["dashboard", ...crumbs.slice(0, idx + 1)].join("/")}`;
              const isLast = idx === crumbs.length - 1;
              return (
                <span key={`${crumb}-${href}`} className="inline-flex items-center gap-1">
                  <ChevronRight size={11} className="shrink-0 text-zinc-300" aria-hidden />
                  {isLast ? (
                    <span className="truncate rounded-lg bg-navy/10 px-2 py-1 font-semibold capitalize text-navy ring-1 ring-navy/10">
                      {segmentLabel(crumb)}
                    </span>
                  ) : (
                    <Link
                      href={href}
                      className="inline-flex items-center rounded-lg border border-transparent px-2 py-1 capitalize transition-colors hover:border-navy/15 hover:bg-navy/5 hover:text-navy"
                    >
                      {segmentLabel(crumb)}
                    </Link>
                  )}
                </span>
              );
            })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {user ? (
          <>
            {user.role === "resort_owner" ? (
              <>
                {showUpgradeCta ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSubscribeModal(true)}
                      className="group relative inline-flex max-w-[9.5rem] items-center justify-center gap-1 overflow-hidden rounded-xl bg-gradient-to-r from-primaryBlue via-[#2d6de8] to-slateBlue px-3 py-2 font-dash text-[10px] font-bold leading-tight text-white shadow-[0_2px_12px_rgba(37,99,235,0.40)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(37,99,235,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryBlue/50 focus-visible:ring-offset-2 active:translate-y-0 sm:max-w-none sm:px-4 sm:text-dash-xs"
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <span className="relative sm:hidden">Upgrade</span>
                      <span className="relative hidden sm:inline">Upgrade to Business Pro</span>
                    </button>

                    <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black leading-none text-white shadow-sm ring-2 ring-white">
                        !
                      </span>
                    </span>
                  </div>
                ) : null}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isSubscribedOwner) {
                        setShowSubscriptionDetails((prev) => !prev);
                      }
                    }}
                    className={`inline-flex max-w-[10rem] items-center gap-1.5 rounded-xl px-2 py-1.5 font-dash text-[10px] font-bold uppercase leading-tight tracking-wide shadow-soft-sm sm:max-w-none sm:gap-2 sm:px-3 sm:py-2 sm:text-dash-xs ${
                      isBusinessPro
                        ? "border border-emerald-300/80 bg-emerald-50 text-emerald-700"
                        : "border border-sky-200/80 bg-sky-50 text-sky-900"
                    }`}
                    aria-expanded={isSubscribedOwner ? showSubscriptionDetails : undefined}
                    aria-haspopup={isSubscribedOwner ? "dialog" : undefined}
                  >
                    {isBusinessPro ? (
                      <BusinessProVerifiedBadge size="sm" />
                    ) : (
                      <Shield size={14} className="shrink-0 max-sm:h-3.5 max-sm:w-3.5" aria-hidden />
                    )}
                    {isBusinessPro ? (
                      <>
                        <span className="truncate sm:hidden">Pro</span>
                        <span className="hidden sm:inline">Premium Verified</span>
                      </>
                    ) : (
                      <>
                        <span className="truncate sm:hidden">Standard</span>
                        <span className="hidden sm:inline">{ownerBadgeLabel}</span>
                      </>
                    )}
                    {isSubscribedOwner ? (
                      <ChevronDown
                        size={14}
                        className={showSubscriptionDetails ? "rotate-180 transition-transform" : "transition-transform"}
                      />
                    ) : null}
                  </button>

                  {isSubscribedOwner && showSubscriptionDetails ? (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-72 rounded-xl border border-softBorder bg-white p-3 shadow-card">
                      <p className="font-dash text-[11px] font-bold uppercase tracking-wide text-zinc-500">Subscription details</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-navy">
                        <span>Plan:</span>
                        {ownerPlan === "business_pro" ? (
                          <span className="inline-flex items-center gap-1">
                            <BusinessProVerifiedBadge size="xs" />
                            Business Pro
                          </span>
                        ) : (
                          <span>Standard (free)</span>
                        )}
                      </p>
                      {isStandardFreeActive ? (
                        <p className="mt-1 text-sm text-zinc-600">
                          Verified listing — no expiration. Upgrade anytime for analytics and up to 20 rooms.
                        </p>
                      ) : (
                        <>
                          {subscriptionEndsAt ? (
                            <p className="mt-1 text-sm text-zinc-700">Expires: {formattedEndDate}</p>
                          ) : null}
                          {subscriptionRemainingLabel ? (
                            <p className="mt-0.5 text-[11px] font-medium tabular-nums text-zinc-400">
                              {hasActiveReferralTrial && !isPaidSubscriptionActive
                                ? `Referral trial · ${subscriptionRemainingLabel}`
                                : subscriptionRemainingLabel}
                            </p>
                          ) : null}
                        </>
                      )}
                      {isPaidSubscriptionActive ? (
                        <p className="mt-2 text-[11px] text-zinc-600">
                          {autoRenewalActive
                            ? `Billing: Auto-renewal (card) · every ${renewalMonths} month${renewalMonths > 1 ? "s" : ""}`
                            : "Billing: Manual renewal — pay each invoice when due"}
                        </p>
                      ) : null}
                      {autoRenewalActive && subscriptionInfo?.nextDueDate ? (
                        <p className="mt-0.5 text-[10px] text-zinc-500">
                          Next billing date:{" "}
                          {new Date(subscriptionInfo.nextDueDate).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      ) : null}
                      {autoRenewalActive ? (
                        <button
                          type="button"
                          disabled={cancellingRecurring}
                          onClick={() => void onCancelAutoRenewal()}
                          className="mt-2 w-full rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                        >
                          {cancellingRecurring ? "Cancelling…" : "Cancel auto-renewal"}
                        </button>
                      ) : null}
                      {!isPaidSubscriptionActive && !isStandardFreeActive ? (
                        <p className="mt-2 text-[11px] text-zinc-500">
                          {hasActiveReferralTrial
                            ? "Referral trial access. Subscribe before your trial ends to keep your resort active."
                            : "Subscribe to activate your plan. Card payments can auto-renew; other methods renew manually."}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {user.role === "marketing" ? (
              <>
                <button
                  type="button"
                  onClick={() => setMarketingTierModalOpen(true)}
                  className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-xl border border-violet-200/90 bg-gradient-to-b from-violet-50 to-white px-2.5 py-2 font-dash text-[10px] font-bold uppercase tracking-wide text-violet-950 shadow-soft-sm transition hover:border-violet-300 hover:shadow-card sm:max-w-none sm:gap-2 sm:px-3 sm:text-dash-xs"
                >
                  <Award size={15} className="shrink-0 text-violet-600" aria-hidden />
                  <span className="hidden min-[400px]:inline">Commissions</span>
                  <span className="hidden tabular-nums text-violet-800 sm:inline">
                    {marketingStats
                      ? `${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(marketingStats.commissionPerBookingPhp)}/bk`
                      : "₱10/bk"}
                  </span>
                </button>
                {mounted ? (
                  <MarketingTiersInfoModal
                    open={marketingTierModalOpen}
                    onClose={() => setMarketingTierModalOpen(false)}
                    commissionPerBookingPhp={marketingStats?.commissionPerBookingPhp ?? 10}
                    usesCustomBookingCommission={marketingStats?.usesCustomBookingCommission}
                    platformDefaultBookingCommissionPhp={marketingStats?.platformDefaultBookingCommissionPhp}
                    qualifyingBookingsCount={marketingStats?.qualifyingBookingsCount ?? 0}
                    qualifyingBookingsMtd={marketingStats?.qualifyingBookingsMtd ?? 0}
                    pendingCommissionsGross={marketingStats?.pendingCommissions ?? 0}
                    pendingPayoutNetEstimate={marketingStats?.pendingPayoutNetEstimate ?? 0}
                    payoutWithholdingRate={marketingStats?.payoutWithholdingRate ?? 0.1}
                    commissionPayoutSchedule={marketingStats?.commission_payout_schedule ?? null}
                    loading={marketingStatsLoading}
                  />
                ) : null}
              </>
            ) : null}

            <div className="flex items-center gap-1.5 rounded-xl border border-white/70 bg-gradient-to-b from-white to-softCard/90 py-1 pl-1 pr-1.5 shadow-card sm:gap-2 sm:pr-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-primaryBlue text-[10px] font-bold text-white shadow-soft-sm sm:h-8 sm:w-8 sm:text-dash-xs">
                {initials}
              </span>
              <div className="hidden min-w-0 max-w-[140px] sm:block">
                <p className="truncate font-dash text-dash-xs font-semibold text-navy">{user.name}</p>
                <p className="truncate font-dash text-[10px] text-zinc-500">{user.email}</p>
                <span
                  className={`inline-flex rounded-full px-1.5 py-0.5 font-dash text-[10px] font-bold uppercase tracking-wide ${roleBadgeClass(user.role)}`}
                >
                  {roleLabel}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void logout().finally(() => {
                  router.replace("/");
                });
              }}
              className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-softBorder bg-white/95 px-2 py-2 font-dash text-dash-xs font-semibold text-navy shadow-soft-sm transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-navy/30 hover:bg-navy/5 hover:text-navy hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 focus-visible:ring-offset-2 sm:min-h-0 sm:min-w-0 sm:px-3"
              aria-label="Log out"
            >
              <LogOut size={14} strokeWidth={2} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </>
        ) : null}
      </div>

      {mounted && showSubscribeModal
        ? createPortal(
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center overflow-x-hidden overflow-y-auto overscroll-y-contain bg-navy/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => setShowSubscribeModal(false)}
        >
          <div
            className="box-border w-full min-w-0 max-w-3xl overflow-hidden rounded-t-2xl border border-skyBlue/20 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.35)] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Business Pro upgrade"
          >
            <div className="relative overflow-hidden border-b border-softBorder/70 bg-gradient-to-r from-navy via-primaryBlue to-slateBlue px-4 pb-3 pt-3 text-white sm:px-6 sm:pb-4 sm:pt-4">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-skyBlue/30 blur-2xl" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[10px]">
                    <BusinessProVerifiedBadge size="xs" />
                    Business Pro
                  </span>
                  <h2 className="mt-1.5 font-dash text-base font-semibold leading-snug sm:mt-2 sm:text-xl">
                    Premium Verified Resort
                  </h2>
                  <p className="mt-1 text-xs leading-snug text-white/85 sm:text-sm">
                    Analytics, priority listing, video, and up to 20 rooms — ₱1,000/month.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubscribeModal(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/15 hover:text-white sm:h-8 sm:w-8"
                  aria-label="Close subscription modal"
                >
                  <X size={16} strokeWidth={2} className="shrink-0" />
                </button>
              </div>
            </div>

            <div className="max-h-[min(78dvh,720px)] space-y-3 overflow-y-auto p-4 sm:max-h-none sm:space-y-4 sm:p-6">
              <div className="rounded-xl border border-skyBlue/20 bg-gradient-to-b from-skyBlue/5 to-white p-3 sm:rounded-2xl sm:p-5">
                <p className="inline-flex items-center gap-1.5 font-dash text-sm font-semibold text-navy sm:text-base">
                  <WalletCards size={14} className="shrink-0 text-primaryBlue sm:h-[15px] sm:w-[15px]" />
                  Business Pro
                </p>
                <p className="mt-1 text-[11px] leading-snug text-zinc-600 sm:text-sm">
                  Standard (free) includes up to 10 rooms. Upgrade for premium tools below.
                </p>
                <div className="hidden">
                  {STANDARD_OFFERS.map((offer) => {
                    const active = selectedDuration === offer.duration;
                    return (
                      <button
                        key={`duration-${offer.duration}`}
                        type="button"
                        onClick={() => undefined}
                        className={`flex min-w-0 flex-col items-stretch gap-1 rounded-lg border px-2.5 py-2 text-left transition sm:rounded-xl sm:px-3 sm:py-2.5 ${
                          active
                            ? "border-primaryBlue bg-primaryBlue/10 ring-1 ring-primaryBlue/30"
                            : "border-softBorder bg-white hover:border-primaryBlue/35"
                        }`}
                      >
                        <span className="flex items-center gap-1 font-dash text-[11px] font-bold leading-tight text-navy sm:text-xs">
                          <CalendarDays size={11} className={`shrink-0 sm:h-3 sm:w-3 ${active ? "text-primaryBlue" : "text-zinc-500"}`} />
                          <span className="min-w-0">
                            {offer.duration} month{offer.duration > 1 ? "s" : ""}
                          </span>
                        </span>
                        <span className="min-w-0 w-full text-[10px] leading-tight text-zinc-500 sm:text-[11px]">
                          {offer.billingType}
                        </span>
                        <span className="mt-0.5 flex min-w-0 flex-col gap-0.5 font-dash text-[10px] font-bold tabular-nums leading-tight text-navy sm:text-[11px]">
                          <span className="whitespace-nowrap text-zinc-400 line-through decoration-zinc-400 decoration-1">
                            {formatPhpLedger(offer.listMonthlyRate)}
                          </span>
                          <span className="whitespace-nowrap text-navy">
                            {formatPhpLedger(offer.monthlyRate)}
                            <span className="font-semibold text-zinc-500">/mo</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-0.5 sm:mt-4">
                  <p className="inline-flex flex-wrap items-end gap-x-2 gap-y-0.5 text-2xl font-black leading-none tracking-tight text-zinc-950 sm:gap-x-2.5 sm:text-4xl">
                    <WalletCards size={18} className="shrink-0 text-primaryBlue sm:mb-1 sm:h-[22px] sm:w-[22px]" />
                    <span className="inline-flex flex-wrap items-end gap-x-1.5 sm:gap-x-2">
                      <span className="tabular-nums">
                        {formatPhpLedger(totalCharge)}
                      </span>
                    </span>
                  </p>
                  <p className="pb-0.5 text-[10px] font-medium lowercase leading-none text-zinc-500 sm:pb-1 sm:text-xs">
                    / month
                  </p>
                </div>
                <p className="mt-1.5 inline-flex flex-wrap items-center gap-1 text-[10px] text-zinc-500 sm:mt-2 sm:gap-1.5 sm:text-xs">
                  <BusinessProVerifiedBadge size="xs" />
                  <span>
                    Total due now:{" "}
                    <span className="font-semibold text-navy">
                      {formatPhpLedger(totalCharge)}
                    </span>
                    <span className="text-zinc-400"> · VAT-inclusive</span>
                  </span>
                </p>
                <p className="mt-1 text-[10px] leading-snug text-zinc-500 sm:text-[11px]">
                  You&apos;ll choose your payment method (card, GCash, Maya, and more) on the secure Xendit checkout page.
                </p>
              </div>

              <ul className="grid gap-1.5 text-[11px] leading-snug text-zinc-700 sm:gap-2.5 sm:text-sm md:grid-cols-2">
                {BUSINESS_PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-1.5 sm:gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium leading-snug text-amber-800 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs">
                Build trust with guests and start accepting online bookings in one setup. All prices are VAT-inclusive.
              </div>

              <div className="flex flex-col-reverse gap-2 pt-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubscribeModal(false);
                  }}
                  className="min-h-10 w-full rounded-xl border border-softBorder bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto sm:px-4 sm:text-sm"
                >
                  Maybe later
                </button>
                <button
                  type="button"
                  onClick={() => void subscribeNow()}
                  disabled={subscribingNow}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-gradient-to-r from-primaryBlue to-slateBlue px-3 py-2 text-xs font-semibold text-white shadow-soft-sm transition-[transform,filter] hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-4 sm:text-sm"
                >
                  {subscribingNow ? <Loader2 size={14} className="animate-spin" /> : "Upgrade — pay now"}
                </button>
              </div>
            </div>
          </div>
        </div>
          ,
          document.body,
        )
        : null}
    </header>
  );
}
