"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import { createSubscriptionInvoice } from "@/lib/api/subscription";
import { getOwnerLandingPage } from "@/lib/api/landingPage";
import { validateReferralCode } from "@/lib/api/referral";
import type { ReadinessPayload } from "@/lib/api/referral";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { sanitizeReferralCodeInput } from "@/lib/inputRestrictions";
import { formatRoleLabel } from "@/lib/utils";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Crown, Gift, Loader2, LogOut, Menu, Sparkles, Tag, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function segmentLabel(segment: string): string {
  return segment.replaceAll("-", " ").replaceAll("_", " ");
}

function roleBadgeClass(role: string): string {
  if (role === "admin") return "bg-navy/10 text-navy ring-1 ring-navy/20";
  if (role === "resort_owner") return "bg-clOcean/10 text-clOcean ring-1 ring-clOcean/20";
  if (role === "marketing") return "bg-violet-50 text-violet-900 ring-1 ring-violet-200/80";
  return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80";
}

type DashboardTopbarProps = { onOpenMenu: () => void };
type OwnerSubscriptionInfo = {
  status: string | null;
  plan: string | null;
  endsAt: string | null;
};

type PlanDuration = 1 | 3 | 6 | 12;
type PlanOffer = { duration: PlanDuration; monthlyRate: number; billingType: "Monthly" | "Upfront" };

const STANDARD_OFFERS: PlanOffer[] = [
  { duration: 1,  monthlyRate: 2300, billingType: "Monthly" },
  { duration: 3,  monthlyRate: 2000, billingType: "Upfront" },
  { duration: 6,  monthlyRate: 1900, billingType: "Upfront" },
  { duration: 12, monthlyRate: 1800, billingType: "Upfront" },
];

const MISSING_FIELD_LABELS: Record<string, string> = {
  resort_name:      "Resort name",
  address:          "Address",
  contact_number:   "Contact number",
  logo:             "Resort logo",
  background_image: "Background/hero image",
  room_with_image:  "At least one active room with a photo",
};

export default function DashboardTopbar({ onOpenMenu }: DashboardTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { pushToast } = useToast();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [appliedReferralCode, setAppliedReferralCode] = useState<string | null>(null);
  const [referralReadiness, setReferralReadiness] = useState<ReadinessPayload | null>(null);
  const [applyingReferral, setApplyingReferral] = useState(false);
  const [subscribingNow, setSubscribingNow] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<PlanDuration>(1);
  const [subscriptionInfo, setSubscriptionInfo] = useState<OwnerSubscriptionInfo | null>(null);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const crumbs = pathname.split("/").filter(Boolean).slice(1);
  const initials =
    user?.name
      ?.split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  const roleLabel = formatRoleLabel(user?.role);
  const isSubscribedOwner =
    user?.role === "resort_owner" && (subscriptionInfo?.status ?? "").toLowerCase() === "active";
  const ownerStatusLabel = (subscriptionInfo?.status ?? "pending_payment").replaceAll("_", " ");
  const formattedEndDate = subscriptionInfo?.endsAt
    ? new Date(subscriptionInfo.endsAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "Not available";
  const selectedOffer = STANDARD_OFFERS.find((o) => o.duration === selectedDuration) ?? STANDARD_OFFERS[0]!;
  // First-month-free: promo only applies when referral code is verified, duration > 1 month,
  // and the resort profile is complete.
  const referralIsReady = Boolean(appliedReferralCode) && (referralReadiness?.is_ready ?? false);
  const isFirstMonthFree = referralIsReady && selectedDuration > 1;
  const totalCharge = isFirstMonthFree
    ? selectedOffer.monthlyRate * (selectedDuration - 1)
    : selectedOffer.monthlyRate * selectedDuration;

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (!showSubscribeModal) {
      setReferralCode("");
      setAppliedReferralCode(null);
      setReferralReadiness(null);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowSubscribeModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSubscribeModal]);

  const applyReferral = async () => {
    const normalized = referralCode.trim().toUpperCase();
    if (!normalized) {
      pushToast({ title: "Referral code required", description: "Enter a referral code first.", tone: "warning" });
      return;
    }
    setApplyingReferral(true);
    try {
      const landing = await getOwnerLandingPage();
      const result = await validateReferralCode(normalized, landing.resort_id);
      if (!result.valid) {
        pushToast({
          title: "Referral code not accepted",
          description: result.message,
          tone: "error",
        });
        return;
      }
      setAppliedReferralCode(result.code);
      setReferralReadiness(result.readiness);
      const ready = result.readiness?.is_ready ?? false;
      pushToast({
        title: "Referral code verified",
        description: ready
          ? `Code verified with ${result.marketer_name}. Your first month is free on 3, 6, or 12-month plans.`
          : `Code verified with ${result.marketer_name}. Complete your resort profile to unlock the first-month-free promo.`,
        tone: ready ? "success" : "warning",
      });
    } catch (err) {
      pushToast({
        title: "Unable to verify code",
        description: parseApiErrorMessage(err, "Check your connection and try again."),
        tone: "error",
      });
    } finally {
      setApplyingReferral(false);
    }
  };

  const subscribeNow = async () => {
    if (!user || user.role !== "resort_owner") return;
    setSubscribingNow(true);
    setShowSubscribeModal(false);
    try {
      const ownerLanding = await getOwnerLandingPage();
      const resortId = ownerLanding.resort_id;
      const result = await createSubscriptionInvoice(
        resortId,
        false,
        undefined,
        appliedReferralCode ?? undefined,
        "monthly",
        undefined,
        selectedDuration,
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
                {!isSubscribedOwner ? (
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
                      <p className="mt-2 text-[11px] text-zinc-500">
                        Recurring billing is enabled. A new invoice is generated automatically each cycle before due date.
                      </p>
                    </div>
                  ) : null}
                </div>
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
            className="box-border w-full min-w-0 max-w-lg overflow-hidden rounded-t-2xl border border-skyBlue/20 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.35)] sm:rounded-3xl"
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
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:mt-3 sm:gap-2 md:grid-cols-4">
                  {STANDARD_OFFERS.map((offer) => {
                    const active = selectedDuration === offer.duration;
                    return (
                      <button
                        key={`duration-${offer.duration}`}
                        type="button"
                        onClick={() => setSelectedDuration(offer.duration)}
                        className={`flex flex-col items-start gap-0.5 rounded-lg border px-2 py-1.5 text-left transition sm:rounded-xl sm:px-2 sm:py-2 ${
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
                        <span className="w-full text-[10px] leading-tight text-zinc-500 sm:text-[11px]">
                          {offer.billingType}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-0.5 sm:mt-4">
                  <p className="inline-flex items-center gap-1.5 text-2xl font-black leading-none tracking-tight text-zinc-950 sm:items-end sm:gap-2 sm:text-4xl">
                    <WalletCards size={18} className="shrink-0 text-primaryBlue sm:mb-1 sm:h-[22px] sm:w-[22px]" />
                    ₱{selectedOffer.monthlyRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="pb-0.5 text-[10px] font-medium lowercase leading-none text-zinc-500 sm:pb-1 sm:text-xs">
                    / month (standard rate)
                  </p>
                </div>
                <p className="mt-1.5 inline-flex flex-wrap items-center gap-1 text-[10px] text-zinc-500 sm:mt-2 sm:gap-1.5 sm:text-xs">
                  <Crown size={12} className="shrink-0 text-primaryBlue sm:h-[13px] sm:w-[13px]" />
                  <span>
                    Total due now:{" "}
                    <span className="font-semibold text-navy">
                      ₱{totalCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      {isFirstMonthFree ? ` (${selectedDuration - 1} of ${selectedDuration} months billed)` : ""}
                    </span>
                  </span>
                </p>
                {isFirstMonthFree ? (
                  <p className="mt-1 inline-flex items-start gap-1 text-[10px] font-semibold leading-snug text-emerald-700 sm:items-center sm:gap-1.5 sm:text-xs">
                    <Gift size={12} className="mt-0.5 shrink-0 sm:mt-0 sm:h-[13px] sm:w-[13px]" />
                    First month free via referral — you get {selectedDuration} months of access.
                  </p>
                ) : null}
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

              <div>
                <label
                  htmlFor="subscribe-referral-code"
                  className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase leading-snug tracking-wide text-zinc-600 sm:mb-1.5 sm:gap-1.5 sm:text-xs"
                >
                  <Tag size={12} className="shrink-0 text-primaryBlue sm:h-[13px] sm:w-[13px]" />
                  Referral code (optional — unlocks 1st month free)
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <input
                    id="subscribe-referral-code"
                    value={referralCode}
                    onChange={(e) => {
                      const v = sanitizeReferralCodeInput(e.target.value);
                      setReferralCode(v);
                      if (!v.trim()) {
                        setAppliedReferralCode(null);
                        setReferralReadiness(null);
                      }
                    }}
                    className="dash-input min-h-11 flex-1 sm:min-h-0"
                    placeholder="e.g. SANTOS1234"
                  />
                  <button
                    type="button"
                    onClick={() => void applyReferral()}
                    disabled={applyingReferral}
                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl border border-softBorder bg-white px-4 text-xs font-semibold text-navy hover:bg-zinc-50 disabled:opacity-60 sm:min-h-0 sm:w-auto sm:min-w-[92px] sm:self-stretch sm:py-2 sm:text-sm"
                  >
                    {applyingReferral ? <Loader2 size={14} className="animate-spin" /> : "Verify"}
                  </button>
                </div>
                {/* Profile readiness checklist shown after code verification */}
                {appliedReferralCode && referralReadiness && !referralReadiness.is_ready ? (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                      <AlertCircle size={13} />
                      Complete your resort profile to unlock the first-month-free promo:
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {referralReadiness.missing_fields.map((f) => (
                        <li key={f} className="inline-flex items-center gap-1.5 text-xs text-amber-700">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                          {MISSING_FIELD_LABELS[f] ?? f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/dashboard/resort/profile"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
                      onClick={() => setShowSubscribeModal(false)}
                    >
                      Go to Resort Profile →
                    </Link>
                  </div>
                ) : null}
                {appliedReferralCode && referralReadiness?.is_ready && selectedDuration === 1 ? (
                  <p className="mt-1.5 text-xs text-amber-700">
                    Select a 3, 6, or 12-month plan to apply the first-month-free promo.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 pt-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubscribeModal(false);
                    setReferralCode("");
                    setAppliedReferralCode(null);
                    setReferralReadiness(null);
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
