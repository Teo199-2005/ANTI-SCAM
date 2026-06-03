"use client";

import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { DismissibleModalShell } from "@/components/ui/DismissibleModalShell";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import {
  MARKETING_MODAL_PANEL_MAX_H_MD,
  MARKETING_MODAL_PANEL_MAX_H_LG,
  MARKETING_MODAL_Z_REGISTER,
} from "@/lib/marketingModalLayout";
import { PREMIUM_MARKETING_BORDER_CLASS } from "@/lib/marketingGoldRibbon";
import { PremiumHighlyRecommendedRibbon } from "@/components/marketing/PremiumHighlyRecommendedRibbon";
import { ResortCatalogBadges } from "@/components/marketing/ResortCatalogBadges";
import { ResortLogoWatermark } from "@/components/marketing/ResortLogoWatermark";
import { CatalogResortMapEmbed } from "@/components/marketing/CatalogResortMapEmbed";
import { cn } from "@/lib/utils";
import { verifyResortLink, type VerifyResortResult, type VerifiedResort } from "@/lib/api/verifyResort";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { formatPhp } from "@/lib/formatPhp";
import { BadgeCheck, BedDouble, ExternalLink, Link2, Search, Shield, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WORDMARK_NAVY = "#0B1F3A";
const SCAM_ALERT_RED = "#E53935";
const VERIFIED_GREEN = "#16a34a";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ModalState = "idle" | "analyzing" | "verified" | "not-verified" | "not-found";

const ANALYZING_STEPS = [
  "Analyzing link…",
  "Checking database…",
  "Verifying resort…",
];

const MIN_ANIMATION_MS = 2500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Animated icons ─────────────────────────────────────────────────────────

function AnimatedCheckmark() {
  return (
    <svg
      viewBox="0 0 52 52"
      className="h-16 w-16"
      aria-hidden
    >
      <circle
        cx="26"
        cy="26"
        r="25"
        fill="none"
        stroke={VERIFIED_GREEN}
        strokeWidth="2"
        className="animate-[draw-circle_0.6s_ease-out_forwards]"
        style={{ strokeDasharray: 157, strokeDashoffset: 157 }}
      />
      <path
        fill="none"
        stroke={VERIFIED_GREEN}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.1 27.2l7.1 7.2 16.7-16.8"
        className="animate-[draw-check_0.4s_0.5s_ease-out_forwards]"
        style={{ strokeDasharray: 48, strokeDashoffset: 48 }}
      />
    </svg>
  );
}

function AnimatedXmark() {
  return (
    <svg
      viewBox="0 0 52 52"
      className="h-16 w-16"
      aria-hidden
    >
      <circle
        cx="26"
        cy="26"
        r="25"
        fill="none"
        stroke={SCAM_ALERT_RED}
        strokeWidth="2"
        className="animate-[draw-circle_0.6s_ease-out_forwards]"
        style={{ strokeDasharray: 157, strokeDashoffset: 157 }}
      />
      <path
        fill="none"
        stroke={SCAM_ALERT_RED}
        strokeWidth="3"
        strokeLinecap="round"
        d="M16 16l20 20"
        className="animate-[draw-check_0.3s_0.5s_ease-out_forwards]"
        style={{ strokeDasharray: 29, strokeDashoffset: 29 }}
      />
      <path
        fill="none"
        stroke={SCAM_ALERT_RED}
        strokeWidth="3"
        strokeLinecap="round"
        d="M36 16l-20 20"
        className="animate-[draw-check_0.3s_0.65s_ease-out_forwards]"
        style={{ strokeDasharray: 29, strokeDashoffset: 29 }}
      />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <div className="absolute inset-0 animate-[pulse-ring_1.5s_ease-out_infinite] rounded-full border-2 border-clTeal/40" />
      <div className="h-10 w-10 animate-spin rounded-full border-3 border-clTeal/20 border-t-clTeal" />
    </div>
  );
}

// ── Detect platform from URL ─────────────────────────────────────────────────

function detectPlatform(url: string): string {
  const host = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "");
  if (host.startsWith("facebook.com") || host.startsWith("fb.com") || host.startsWith("m.facebook.com")) return "Facebook page";
  if (host.startsWith("instagram.com")) return "Instagram page";
  if (host.startsWith("tiktok.com") || host.startsWith("vm.tiktok.com")) return "TikTok page";
  if (host.startsWith("youtube.com") || host.startsWith("youtu.be")) return "YouTube channel";
  return "link";
}

// ── Warning message (shared between not-verified and not-found) ──────────────

function ScamWarningBlock({ url }: { url?: string }) {
  const platform = url ? detectPlatform(url) : "link";
  const isSocial = platform !== "link";

  return (
    <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm leading-relaxed text-rose-900">
      <p>
        {isSocial ? (
          <>This {platform} or resort listing has not yet completed Anti-Scam PH verification
          through site visitation or live video verification.</>
        ) : (
          <>This link has not yet been associated with any Anti-Scam PH verified resort
          through site visitation or live video verification.</>
        )}
      </p>
      <p>
        For your safety, please avoid sending full payment or reservation deposits unless you
        have independently confirmed the property&apos;s legitimacy.
      </p>
      <p className="font-semibold">
        We strongly recommend booking only through Anti-Scam PH Verified Resorts to secure your
        reservation and reduce the risk of fake resort scams.
      </p>
    </div>
  );
}

// ── Verified resort card (matches ResortRoomsPreviewModal structure) ─────────

function VerifiedResortCard({ resort, onVerifyAnother }: { resort: VerifiedResort; onVerifyAnother: () => void }) {
  const bgSrc = resort.backgroundImageUrl ? laravelPublicUrl(resort.backgroundImageUrl) : null;
  const premium = resort.isPremiumVerified;
  const hasMap = Boolean(resort.map?.embedUrl);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Premium ribbon */}
      {premium ? <PremiumHighlyRecommendedRibbon variant="border" /> : null}

      {/* Hero section with background - matches ResortRoomsPreviewModal */}
      <div className="relative shrink-0 overflow-hidden border-b border-zinc-200">
        {bgSrc ? (
          <>
            <div className="relative h-24 w-full sm:h-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bgSrc} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f3c]/90 via-[#0d1f3c]/40 to-transparent" aria-hidden />
              <ResortLogoWatermark
                logoUrl={resort.logoUrl}
                resortName={resort.name}
                size="lg"
                className="right-12 top-2 sm:right-14 sm:top-2.5"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 sm:px-5">
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 pr-10 sm:pr-12">
                  <h2 className="font-heading text-lg font-bold leading-tight text-white drop-shadow-sm sm:text-xl">
                    {resort.name}
                  </h2>
                  <ResortCatalogBadges
                    badgeLabel={resort.badgeLabel ?? undefined}
                    isPremiumVerified={resort.isPremiumVerified}
                    isVip={resort.isVip}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-[11px] text-white/70">
                    Tap a room to check dates and book
                  </p>
                  {resort.landingUrl && (
                    <a
                      href={resort.landingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold text-sky-100/95 underline-offset-2 hover:underline"
                    >
                      <ExternalLink size={12} className="shrink-0 opacity-80" aria-hidden />
                      <span>Public booking page</span>
                      <span className="font-mono text-[10px] font-normal text-white/55">{resort.landingUrl}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gradient-to-br from-sky-50 via-white to-amber-50/50 px-4 py-3 sm:px-5">
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0 pr-10 sm:pr-12">
                <h2 className="font-heading text-lg font-bold leading-tight text-[#0d1f3c] sm:text-xl">
                  {resort.name}
                </h2>
                <ResortCatalogBadges
                  badgeLabel={resort.badgeLabel ?? undefined}
                  isPremiumVerified={resort.isPremiumVerified}
                  isVip={resort.isVip}
                  className="mt-1.5"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Tap a room to check dates and book
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verification status banner */}
      <div className="flex shrink-0 items-center justify-center gap-3 border-b border-emerald-100 bg-emerald-50/60 px-4 py-2.5 sm:py-3">
        <AnimatedCheckmark />
        <div>
          <p className="font-heading text-base font-bold" style={{ color: VERIFIED_GREEN }}>
            Verification Status
          </p>
          <p className="font-heading text-sm font-bold text-[#0d1f3c]">
            Anti-Scam PH Verified
          </p>
        </div>
      </div>

      {/* Rooms content area - scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {resort.rooms.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resort.rooms.slice(0, 6).map((room, i) => {
              const primaryImage = room.images[0];
              const imgSrc = primaryImage ? laravelPublicUrl(primaryImage.url) : null;
              return (
                <article
                  key={i}
                  className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-0 shadow-sm transition hover:-translate-y-px hover:shadow-md"
                >
                  {imgSrc ? (
                    <div className="relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden bg-zinc-100 sm:aspect-[2/1]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={room.name}
                        className="max-h-full max-w-full object-contain object-center"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[3/2] w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 sm:aspect-[2/1]">
                      <BedDouble className="h-8 w-8 text-zinc-400" aria-hidden />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="text-left font-heading text-sm font-semibold leading-tight text-[#0d1f3c] line-clamp-2">
                      {room.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200/90 bg-zinc-50/90 px-2 py-0.5 text-[11px] font-medium text-zinc-800 sm:text-[10px]">
                        <Users size={10} className="shrink-0 text-zinc-500" aria-hidden />
                        Guests
                      </span>
                      {room.basePrice > 0 && (
                        <span className="inline-flex items-center rounded-full border border-zinc-300/80 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-800 sm:text-[10px]">
                          {formatPhp(room.basePrice)}<span className="font-normal text-zinc-500">/night</span>
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-zinc-500">No active rooms listed yet.</p>
        )}

        {/* Google Maps widget - below rooms */}
        {hasMap && resort.map && (
          <CatalogResortMapEmbed
            resortName={resort.name}
            map={resort.map}
            compact
            className="mt-4"
          />
        )}
      </div>

      {/* Footer - matches ResortRoomsPreviewModal */}
      <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/90 px-4 py-3 sm:px-5">
        {resort.landingUrl ? (
          <a
            href={resort.landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0d1f3c] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0d1f3c]/90"
            >
              <ExternalLink size={14} className="opacity-80" aria-hidden />
              Open public booking page
            </button>
          </a>
        ) : null}
        <button
          type="button"
          onClick={onVerifyAnother}
          className="mt-2 w-full text-center text-xs font-semibold text-slate-500 hover:text-clTeal transition"
        >
          Verify another link
        </button>
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────

export function VerifyResortModal({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<ModalState>("idle");
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<VerifyResortResult | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setState("idle");
      setInputValue("");
      setInputError(null);
      setStepIndex(0);
      setResult(null);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    }
  }, [open]);

  // Cycle through analyzing steps
  useEffect(() => {
    if (state !== "analyzing") return;
    setStepIndex(0);
    stepTimerRef.current = setInterval(() => {
      setStepIndex((prev) => (prev < ANALYZING_STEPS.length - 1 ? prev + 1 : prev));
    }, 800);
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [state]);

  const handleSubmit = useCallback(async () => {
    const url = inputValue.trim();
    setInputError(null);

    if (!url) {
      setInputError("Please paste a link to verify.");
      return;
    }

    // Basic URL validation
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      setInputError("Please enter a valid URL.");
      return;
    }

    setState("analyzing");

    const [apiResult] = await Promise.all([
      verifyResortLink(url.startsWith("http") ? url : `https://${url}`).catch(() => null),
      sleep(MIN_ANIMATION_MS),
    ]);

    if (!apiResult) {
      setState("not-found");
      setResult({ verified: false, resort: null, message: "Could not reach the verification server. Please try again." });
      return;
    }

    setResult(apiResult);
    if (apiResult.verified) {
      setState("verified");
    } else if (apiResult.resort) {
      setState("not-verified");
    } else {
      setState("not-found");
    }
  }, [inputValue]);

  if (!mounted || !open) return null;

  // Dynamic panel size: larger for verified state to match /resorts modal
  const isVerifiedState = state === "verified" && result?.verified;
  const panelClass = cn(
    "pointer-events-auto w-full rounded-2xl bg-white",
    isVerifiedState
      ? cn(
          "flex flex-col max-w-5xl",
          result?.resort?.isPremiumVerified
            ? cn("overflow-visible", PREMIUM_MARKETING_BORDER_CLASS)
            : "overflow-hidden border border-slate-200/95 shadow-[0_25px_50px_-12px_rgba(13,31,60,0.35)]",
          MARKETING_MODAL_PANEL_MAX_H_LG,
        )
      : cn("overflow-hidden max-w-lg border border-slate-200/95 shadow-[0_25px_50px_-12px_rgba(13,31,60,0.35)] ring-1 ring-black/5", MARKETING_MODAL_PANEL_MAX_H_MD),
  );

  return createPortal(
    <DismissibleModalShell
      open={open}
      onClose={onClose}
      zIndexClass={MARKETING_MODAL_Z_REGISTER}
      backdropClassName="bg-[#0d1f3c]/65 backdrop-blur-[3px]"
      escapeToClose={state !== "analyzing"}
      dismissOnBackdrop={state !== "analyzing"}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-resort-title"
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient accent bar */}
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-clTeal via-amber-400 to-clCoral" aria-hidden />

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <ImageWithFallback
                src="/branding/mainlogo.png"
                alt="Anti-Scam PH"
                width={48}
                height={48}
                className="h-full w-full object-contain p-1.5"
                sizes="48px"
              />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="font-pop text-[11px] font-extrabold uppercase tracking-[0.12em] sm:text-xs">
                <span style={{ color: WORDMARK_NAVY }}>ANTI-</span>
                <span style={{ color: SCAM_ALERT_RED }}>SCAM</span>
                <span style={{ color: WORDMARK_NAVY }}> PH</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Verify Resort</p>
            </div>
          </div>
          <ModalCloseButton onClose={onClose} className="shrink-0" />
        </div>

        {/* Content - padded for non-verified states */}
        {!(state === "verified" && result?.verified && result.resort) && (
        <div className="space-y-4 overflow-y-auto bg-white px-4 pt-5 pb-8 sm:px-6 sm:pt-6 sm:pb-10">

          {/* ─── IDLE: Input form ─── */}
          {state === "idle" && (
            <div className="animate-[fade-in_0.3s_ease-out] space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 shrink-0 text-clTeal" aria-hidden />
                <h2 id="verify-resort-title" className="font-heading text-lg font-bold text-[#0d1f3c] sm:text-xl">
                  Verify a Resort Link
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Paste the link of the resort you want to verify — <strong>Facebook page</strong>, Instagram, TikTok,
                website, or an Anti-Scam PH resort link.
              </p>

              <div className="space-y-1.5">
                <label htmlFor="verify-url-input" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Resort Link
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <input
                      id="verify-url-input"
                      type="url"
                      placeholder="https://facebook.com/resortname"
                      value={inputValue}
                      onChange={(e) => { setInputValue(e.target.value); setInputError(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
                      className={cn(
                        "w-full rounded-lg border bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition",
                        inputError
                          ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                          : "border-slate-200 focus:border-clTeal focus:ring-2 focus:ring-clTeal/20",
                      )}
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-clTeal px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-clTeal/90 active:scale-[0.97]"
                  >
                    <Search className="h-4 w-4" aria-hidden />
                    Verify
                  </button>
                </div>
                {inputError && (
                  <p className="text-xs text-rose-600 animate-[fade-in_0.2s_ease-out]">{inputError}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#0d1f3c]">
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                  Legitimacy checks
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#0d1f3c]">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-clTeal" aria-hidden />
                  Anti-scam database
                </span>
              </div>
            </div>
          )}

          {/* ─── ANALYZING: Loading animation ─── */}
          {state === "analyzing" && (
            <div className="flex flex-col items-center gap-4 py-6 animate-[fade-in_0.3s_ease-out]">
              <LoadingSpinner />
              <div className="h-6 overflow-hidden">
                {ANALYZING_STEPS.map((step, i) => (
                  <p
                    key={step}
                    className={cn(
                      "text-center text-sm font-semibold text-clTeal transition-all duration-300",
                      i === stepIndex
                        ? "opacity-100 translate-y-0"
                        : i < stepIndex
                          ? "opacity-0 -translate-y-4"
                          : "opacity-0 translate-y-4",
                    )}
                  >
                    {step}
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-clTeal" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-clTeal" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-clTeal" style={{ animationDelay: "300ms" }} />
                </div>
                Checking against our verified resort database
              </div>
            </div>
          )}

          {/* ─── VERIFIED: Success result - rendered outside padded div ─── */}

          {/* ─── NOT VERIFIED: Found but not verified ─── */}
          {state === "not-verified" && result && !result.verified && result.resort && (
            <div className="animate-[fade-in_0.4s_ease-out] space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <AnimatedXmark />
                <div className="text-center">
                  <p className="font-heading text-lg font-bold" style={{ color: SCAM_ALERT_RED }}>
                    Verification Status
                  </p>
                  <p className="font-heading text-sm font-bold text-[#0d1f3c]">
                    Not Yet Verified by Anti-Scam PH
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-amber-900">
                  {result.resort.name}
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Found in our database — verification pending
                </p>
              </div>

              <ScamWarningBlock url={inputValue} />

              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href="/resorts"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-bold text-[#0d1f3c] transition hover:bg-slate-50"
                >
                  Browse verified resorts
                </a>
                <button
                  type="button"
                  onClick={() => { setState("idle"); setInputValue(""); setResult(null); }}
                  className="flex-1 rounded-lg bg-clTeal px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-clTeal/90"
                >
                  Verify another link
                </button>
              </div>
            </div>
          )}

          {/* ─── NOT FOUND: No match in database ─── */}
          {state === "not-found" && (
            <div className="animate-[fade-in_0.4s_ease-out] space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <AnimatedXmark />
                <div className="text-center">
                  <p className="font-heading text-lg font-bold" style={{ color: SCAM_ALERT_RED }}>
                    Verification Status
                  </p>
                  <p className="font-heading text-sm font-bold text-[#0d1f3c]">
                    Not Found in Our Database
                  </p>
                </div>
              </div>

              {result?.message && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <p className="text-sm text-slate-600">{result.message}</p>
                </div>
              )}

              <ScamWarningBlock url={inputValue} />

              <a
                href="/resorts"
                className="block w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-bold text-[#0d1f3c] transition hover:bg-slate-50"
              >
                Browse verified resorts
              </a>
              <button
                type="button"
                onClick={() => { setState("idle"); setInputValue(""); setResult(null); }}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-clTeal transition"
              >
                Verify another link
              </button>
            </div>
          )}
        </div>
        )}

        {/* ─── VERIFIED: Full-width layout (no padding) ─── */}
        {state === "verified" && result?.verified && result.resort && (
          <VerifiedResortCard
            resort={result.resort}
            onVerifyAnother={() => { setState("idle"); setInputValue(""); setResult(null); }}
          />
        )}
      </div>
    </DismissibleModalShell>,
    document.body,
  );
}
