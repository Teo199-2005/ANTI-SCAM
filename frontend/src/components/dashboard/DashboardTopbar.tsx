"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import { createSubscriptionInvoice } from "@/lib/api/subscription";
import { getOwnerLandingPage } from "@/lib/api/landingPage";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { getMarketingStats, type MarketingStats } from "@/lib/api/marketing";
import { formatRoleLabel } from "@/lib/utils";
import { BrandWordmark } from "@/components/branding/BrandWordmark";
import MarketingTiersInfoModal from "@/components/dashboard/MarketingTiersInfoModal";
import MarketerTierBadge from "@/components/dashboard/MarketerTierBadge";
import { Award, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Crown, Loader2, LogOut, Menu, Sparkles, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatOwnerConsoleStatusLabel } from "@/lib/billing/subscriptionStatus";
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
  status: string | null;
  plan: string | null;
  endsAt: string | null;
};

type PlanDuration = 1 | 3 | 6 | 12;
type PlanOffer = {
  duration: PlanDuration;
  /** Charged monthly rate for this prepay tier */
  monthlyRate: number;
  /** Shown struck through as “was” price */
  listMonthlyRate: number;
  billingType: "Monthly" | "Upfront";
};

const STANDARD_OFFERS: PlanOffer[] = [
  { duration: 1, monthlyRate: 2100, listMonthlyRate: 3000, billingType: "Monthly" },
  { duration: 3, monthlyRate: 1900, listMonthlyRate: 2700, billingType: "Upfront" },
  { duration: 6, monthlyRate: 1700, listMonthlyRate: 2500, billingType: "Upfront" },
  { duration: 12, monthlyRate: 1500, listMonthlyRate: 2300, billingType: "Upfront" },
];

export default function DashboardTopbar({ onOpenMenu }: DashboardTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { pushToast } = useToast();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [subscribingNow, setSubscribingNow] = useState(false);
  const subscribeInFlightRef = useRef(false);
  const [selectedDuration, setSelectedDuration] = useState<PlanDuration>(1);
  const [subscriptionInfo, setSubscriptionInfo] = useState<OwnerSubscriptionInfo | null>(null);
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
    (user?.role === "resort_owner" && ownerHasWorkspace ? "expired" : "active")
  ).toLowerCase();
  const isSubscribedOwner =
    user?.role === "resort_owner" &&
    (subscriptionStatus === "active" || hasActiveReferralTrial);
  const showSubscribeCta =
    user?.role === "resort_owner" && ownerHasWorkspace && subscriptionStatus === "expired";
  const ownerStatusLabel = formatOwnerConsoleStatusLabel(subscriptionStatus, hasActiveReferralTrial);
  const subscriptionEndsAt =
    subscriptionInfo?.endsAt ?? (hasActiveReferralTrial ? (user?.referral_trial?.ends_at ?? null) : null);
  const formattedEndDate = subscriptionEndsAt
    ? new Date(subscriptionEndsAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "Not available";
  const subscriptionDaysLeft = subscriptionDaysRemaining(subscriptionEndsAt);
  const subscriptionRemainingLabel = formatSubscriptionRemainingLabel(subscriptionDaysLeft);
  const isPaidSubscriptionActive = subscriptionStatus === "active";
  const selectedOffer = STANDARD_OFFERS.find((o) => o.duration === selectedDuration) ?? STANDARD_OFFERS[0]!;
  const totalCharge = selectedOffer.monthlyRate * selectedDuration;

  useEffect(() => {
    setMounted(true);
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
            status: landing.subscription_status ?? null,
            plan: landing.subscription_plan ?? null,
            endsAt: landing.subscription_end_at ?? null,
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
    const durationForCheckout = selectedDuration;
    setShowSubscribeModal(false);
    try {
      const result = await createSubscriptionInvoice(
        false,
        undefined,
        undefined,
        "monthly",
        undefined,
        durationForCheckout,
        typeof window !== "undefined" ? window.location.origin : undefined,
      );
      window.location.href = result.invoice_url;
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
                {showSubscribeCta ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSubscribeModal(true)}
                      className="group relative inline-flex max-w-[9.5rem] items-center justify-center gap-1 overflow-hidden rounded-xl bg-gradient-to-r from-primaryBlue via-[#2d6de8] to-slateBlue px-3 py-2 font-dash text-[10px] font-bold leading-tight text-white shadow-[0_2px_12px_rgba(37,99,235,0.40)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(37,99,235,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryBlue/50 focus-visible:ring-offset-2 active:translate-y-0 sm:max-w-none sm:px-4 sm:text-dash-xs"
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <span className="relative sm:hidden">Subscribe</span>
                      <span className="relative hidden sm:inline">Subscribe now</span>
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
                      isSubscribedOwner
                        ? "border border-emerald-300/80 bg-emerald-50 text-emerald-700"
                        : "border border-amber-300/80 bg-amber-50 text-amber-700"
                    }`}
                    aria-expanded={isSubscribedOwner ? showSubscriptionDetails : undefined}
                    aria-haspopup={isSubscribedOwner ? "dialog" : undefined}
                  >
                    <Crown size={14} className="shrink-0 max-sm:h-3.5 max-sm:w-3.5" />
                    {isSubscribedOwner ? (
                      <>
                        <span className="truncate sm:hidden">Premium</span>
                        <span className="hidden sm:inline">Status: Premium (active)</span>
                      </>
                    ) : (
                      <>
                        <span className="truncate sm:hidden">{ownerStatusLabel}</span>
                        <span className="hidden sm:inline">Status: {ownerStatusLabel}</span>
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
                      <p className="mt-1 text-sm font-semibold text-navy">
                        Plan: {(subscriptionInfo?.plan ?? "basic").toUpperCase()}
                      </p>
                      <p className="mt-1 text-sm text-zinc-700">Expires: {formattedEndDate}</p>
                      {subscriptionRemainingLabel ? (
                        <p className="mt-0.5 text-[11px] font-medium tabular-nums text-zinc-400">
                          {hasActiveReferralTrial && !isPaidSubscriptionActive
                            ? `Referral trial · ${subscriptionRemainingLabel}`
                            : subscriptionRemainingLabel}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] text-zinc-500">
                        {isPaidSubscriptionActive
                          ? "Recurring billing is enabled. A new invoice is generated automatically each cycle before due date."
                          : hasActiveReferralTrial
                            ? "Referral trial access. Subscribe before your trial ends to keep your resort active."
                            : "Subscribe to activate your plan and enable recurring billing."}
                      </p>
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
                  <span className="hidden min-[400px]:inline">Tiers</span>
                  <MarketerTierBadge
                    tierKey={marketingStats?.marketerTier?.tierKey}
                    label={marketingStats?.marketerTier?.label}
                    size="sm"
                    showGem={false}
                    className="hidden sm:inline-flex"
                  />
                </button>
                {mounted ? (
                  <MarketingTiersInfoModal
                    open={marketingTierModalOpen}
                    onClose={() => setMarketingTierModalOpen(false)}
                    tierLadder={marketingStats?.tierLadder ?? []}
                    tierPolicy={marketingStats?.tierPolicy ?? ""}
                    marketerTier={marketingStats?.marketerTier ?? null}
                    convertingClientsCount={marketingStats?.convertingClientsCount ?? 0}
                    convertingResortsWithReferralCount={marketingStats?.convertingResortsWithReferralCount ?? 0}
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
            aria-label="Standard subscription details"
          >
            <div className="relative overflow-hidden border-b border-softBorder/70 bg-gradient-to-r from-navy via-primaryBlue to-slateBlue px-4 pb-3 pt-3 text-white sm:px-6 sm:pb-4 sm:pt-4">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-skyBlue/30 blur-2xl" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[10px]">
                    <Sparkles size={11} className="shrink-0 sm:h-3 sm:w-3" aria-hidden />
                    Subscription Offer
                  </span>
                  <h2 className="mt-1.5 font-dash text-base font-semibold leading-snug sm:mt-2 sm:text-xl">
                    Best for direct resort onboarding
                  </h2>
                  <p className="mt-1 text-xs leading-snug text-white/85 sm:text-sm">
                    Launch faster with one complete monthly package.
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
                  Standard Subscription
                </p>
                <p className="mt-1 inline-flex items-start gap-1.5 text-[11px] leading-snug text-zinc-600 sm:items-center sm:text-sm">
                  <CalendarDays size={13} className="mt-0.5 shrink-0 text-zinc-500 sm:mt-0 sm:h-[14px] sm:w-[14px]" />
                  Choose your plan duration (3 rooms included)
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-3 sm:gap-2.5 lg:grid-cols-4">
                  {STANDARD_OFFERS.map((offer) => {
                    const active = selectedDuration === offer.duration;
                    return (
                      <button
                        key={`duration-${offer.duration}`}
                        type="button"
                        onClick={() => setSelectedDuration(offer.duration)}
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
                            ₱{offer.listMonthlyRate.toLocaleString()}
                          </span>
                          <span className="whitespace-nowrap text-navy">
                            ₱{offer.monthlyRate.toLocaleString()}
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
                      <span className="text-lg font-bold tabular-nums text-zinc-400 line-through decoration-zinc-400 decoration-2 sm:text-3xl">
                        ₱{selectedOffer.listMonthlyRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="tabular-nums">
                        ₱{selectedOffer.monthlyRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </span>
                  </p>
                  <p className="pb-0.5 text-[10px] font-medium lowercase leading-none text-zinc-500 sm:pb-1 sm:text-xs">
                    / month (promo rate)
                  </p>
                </div>
                <p className="mt-1.5 inline-flex flex-wrap items-center gap-1 text-[10px] text-zinc-500 sm:mt-2 sm:gap-1.5 sm:text-xs">
                  <Crown size={12} className="shrink-0 text-primaryBlue sm:h-[13px] sm:w-[13px]" />
                  <span>
                    Total due now:{" "}
                    <span className="font-semibold text-navy">
                      ₱{totalCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </span>
                </p>
              </div>

              <ul className="grid gap-1.5 text-[11px] leading-snug text-zinc-700 sm:gap-2.5 sm:text-sm md:grid-cols-2">
                <li className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
                  Booking Management System
                </li>
                <li className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
                  Payment System (Gcash or credit cards)
                </li>
                <li className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
                  5 pictures per room allowed
                </li>
                <li className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
                  Full room description
                </li>
                <li className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
                  Real time room availability
                </li>
                <li className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
                  Tech Support 8am-4pm Mon-Fri
                </li>
              </ul>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium leading-snug text-amber-800 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs">
                Build trust with guests and start accepting online bookings in one setup. VAT is added at checkout by final invoice computation.
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
                  {subscribingNow ? <Loader2 size={14} className="animate-spin" /> : "Subscribe now"}
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
