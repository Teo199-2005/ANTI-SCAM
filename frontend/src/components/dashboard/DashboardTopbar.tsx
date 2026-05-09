"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import { createSubscriptionInvoice } from "@/lib/api/subscription";
import { getOwnerLandingPage } from "@/lib/api/landingPage";
import { validateReferralCode } from "@/lib/api/referral";
import type { ReadinessPayload } from "@/lib/api/referral";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
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

  const leaf = crumbs.length ? segmentLabel(crumbs[crumbs.length - 1]!) : "Dashboard";
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
    <header className="dash-topbar sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-softBorder bg-white/90 text-zinc-500 shadow-soft-sm transition-[transform,color,background-color,border-color,box-shadow] duration-150 hover:border-navy/20 hover:bg-navy/5 hover:text-navy active:scale-[0.96] md:hidden"
          onClick={onOpenMenu}
          aria-label="Open navigation"
        >
          <Menu size={16} />
        </button>

        <div className="min-w-0">
          <p className="truncate font-dash text-dash-sm font-semibold capitalize text-navy md:hidden">{leaf}</p>
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1 font-dash text-dash-xs text-zinc-500 md:flex">
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
                      className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-primaryBlue via-[#2d6de8] to-slateBlue px-4 py-2 font-dash text-dash-xs font-bold text-white shadow-[0_2px_12px_rgba(37,99,235,0.40)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(37,99,235,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryBlue/50 focus-visible:ring-offset-2 active:translate-y-0"
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <span className="relative">Subscribe now</span>
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
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-dash text-dash-xs font-bold uppercase tracking-wide shadow-soft-sm ${
                      isSubscribedOwner
                        ? "border border-emerald-300/80 bg-emerald-50 text-emerald-700"
                        : "border border-amber-300/80 bg-amber-50 text-amber-700"
                    }`}
                    aria-expanded={isSubscribedOwner ? showSubscriptionDetails : undefined}
                    aria-haspopup={isSubscribedOwner ? "dialog" : undefined}
                  >
                    <Crown size={14} />
                    {isSubscribedOwner ? "Status: Premium (active)" : `Status: ${ownerStatusLabel}`}
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
            <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-gradient-to-b from-white to-softCard/90 py-1 pl-1 pr-2 shadow-card">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-primaryBlue text-dash-xs font-bold text-white shadow-soft-sm">
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
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-softBorder bg-white/95 px-3 py-2 font-dash text-dash-xs font-semibold text-navy shadow-soft-sm transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-navy/30 hover:bg-navy/5 hover:text-navy hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 focus-visible:ring-offset-2"
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
          className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/55 p-4 backdrop-blur-[2px]"
          onClick={() => setShowSubscribeModal(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-skyBlue/20 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.35)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Standard subscription details"
          >
            <div className="relative overflow-hidden border-b border-softBorder/70 bg-gradient-to-r from-navy via-primaryBlue to-slateBlue px-6 pb-4 pt-4 text-white">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-skyBlue/30 blur-2xl" />
              <button
                type="button"
                onClick={() => setShowSubscribeModal(false)}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Close subscription modal"
              >
                <X size={16} />
              </button>
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90">
                  <Sparkles size={12} />
                  Subscription Offer
                </span>
                <h2 className="mt-2 font-dash text-xl font-semibold">Best for direct resort onboarding</h2>
                <p className="mt-1 text-sm text-white/85">Launch faster with one complete monthly package.</p>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-skyBlue/20 bg-gradient-to-b from-skyBlue/5 to-white p-5">
                <p className="inline-flex items-center gap-1.5 font-dash text-base font-semibold text-navy">
                  <WalletCards size={15} className="text-primaryBlue" />
                  Standard Subscription
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-600">
                  <CalendarDays size={14} className="text-zinc-500" />
                  Choose your plan duration (3 rooms included)
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STANDARD_OFFERS.map((offer) => {
                    const active = selectedDuration === offer.duration;
                    return (
                      <button
                        key={`duration-${offer.duration}`}
                        type="button"
                        onClick={() => setSelectedDuration(offer.duration)}
                        className={`rounded-xl border px-2 py-2 text-left transition ${
                          active
                            ? "border-primaryBlue bg-primaryBlue/10 ring-1 ring-primaryBlue/30"
                            : "border-softBorder bg-white hover:border-primaryBlue/35"
                        }`}
                      >
                        <p className="inline-flex items-center gap-1 text-xs font-bold text-navy">
                          <CalendarDays size={12} className={active ? "text-primaryBlue" : "text-zinc-500"} />
                          {offer.duration} month{offer.duration > 1 ? "s" : ""}
                        </p>
                        <p className="text-[11px] text-zinc-500">{offer.billingType}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <p className="inline-flex items-end gap-2 text-4xl font-black leading-none tracking-tight text-zinc-950">
                    <WalletCards size={22} className="mb-1 text-primaryBlue" />
                    ₱{selectedOffer.monthlyRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="pb-1 text-xs font-medium lowercase text-zinc-500">/ month (standard rate)</p>
                </div>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <Crown size={13} className="text-primaryBlue" />
                  Total due now:{" "}
                  <span className="font-semibold text-navy">
                    ₱{totalCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    {isFirstMonthFree ? ` (${selectedDuration - 1} of ${selectedDuration} months billed)` : ""}
                  </span>
                </p>
                {isFirstMonthFree ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <Gift size={13} />
                    First month free via referral — you get {selectedDuration} months of access.
                  </p>
                ) : null}
              </div>

              <ul className="grid gap-2.5 text-sm text-zinc-700 sm:grid-cols-2">
                <li className="inline-flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />Booking Management System</li>
                <li className="inline-flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />Payment System (Gcash or credit cards)</li>
                <li className="inline-flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />5 pictures per room allowed</li>
                <li className="inline-flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />Full room description</li>
                <li className="inline-flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />Real time room availability</li>
                <li className="inline-flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />Tech Support 8am-4pm Mon-Fri</li>
              </ul>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Build trust with guests and start accepting online bookings in one setup. VAT is added at checkout by final invoice computation.
              </div>

              <div>
                <label htmlFor="subscribe-referral-code" className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <Tag size={13} className="text-primaryBlue" />
                  Referral code (optional — unlocks 1st month free)
                </label>
                <div className="flex gap-2">
                  <input
                    id="subscribe-referral-code"
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase());
                      if (!e.target.value.trim()) {
                        setAppliedReferralCode(null);
                        setReferralReadiness(null);
                      }
                    }}
                    className="dash-input"
                    placeholder="e.g. SANTOS1234"
                  />
                  <button
                    type="button"
                    onClick={() => void applyReferral()}
                    disabled={applyingReferral}
                    className="inline-flex min-w-[92px] items-center justify-center rounded-xl border border-softBorder bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-zinc-50 disabled:opacity-60"
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

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubscribeModal(false);
                    setReferralCode("");
                    setAppliedReferralCode(null);
                    setReferralReadiness(null);
                  }}
                  className="rounded-xl border border-softBorder bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Maybe later
                </button>
                <button
                  type="button"
                  onClick={() => void subscribeNow()}
                  disabled={subscribingNow}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primaryBlue to-slateBlue px-4 py-2 text-sm font-semibold text-white shadow-soft-sm transition-[transform,filter] hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
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
