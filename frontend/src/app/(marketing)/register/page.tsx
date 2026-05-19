"use client";

import { AuthPageBrandTagline } from "@/components/branding/AuthPageBrandTagline";
import { AuthSplitShell, AUTH_MARKETING_CARD } from "@/components/auth/AuthSplitShell";
import PasswordRequirementsMeter from "@/components/auth/PasswordRequirementsMeter";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useHydrated } from "@/hooks/useHydrated";
import { useRegisterModal } from "@/contexts/RegisterModalContext";
import { googleOAuthRedirectUrl } from "@/lib/api/baseUrl";
import { buildLoginUrl, resolveGuestPostAuthPath } from "@/lib/auth/clientAuthUrls";
import { publicClient } from "@/lib/api/client";
import { validateReferralCodePublic } from "@/lib/api/referral";
import { LegalLinkButton } from "@/components/legal/LegalLinkButton";
import {
  sanitizeBusinessOrResortName,
  sanitizeEmailTyping,
  sanitizePersonName,
  sanitizePhilippinesMobileInput,
  sanitizeReferralCodeInput,
} from "@/lib/inputRestrictions";
import { getPasswordPolicyChecks, passwordPolicyMet } from "@/lib/passwordStrength";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { DismissibleModalShell } from "@/components/ui/DismissibleModalShell";
import { MARKETING_MODAL_CENTER_FRAME_CLASS, MARKETING_MODAL_Z_REGISTER } from "@/lib/marketingModalLayout";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, Gift, Loader2, Lock, Mail, UserPlus, X } from "lucide-react";

const authInput =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-clOcean focus:ring-2 focus:ring-clOcean/20 max-lg:min-h-[2.625rem] md:py-2";

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const hydrated = useHydrated();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [referralDraft, setReferralDraft] = useState("");
  const [appliedReferral, setAppliedReferral] = useState<{ code: string; marketerName: string } | null>(null);
  const [referralFieldError, setReferralFieldError] = useState<string | null>(null);
  const [referralVerifyModalOpen, setReferralVerifyModalOpen] = useState(false);
  const [trialSuccessModal, setTrialSuccessModal] = useState<{
    marketerName: string;
    code: string;
    endsAt: string | null;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  const refFromQuery = searchParams.get("ref") ?? searchParams.get("referral") ?? "";
  const hasReferralRef = Boolean(sanitizeReferralCodeInput(refFromQuery));

  const intentRaw = searchParams.get("intent")?.trim() ?? "";
  const resortSlug = searchParams.get("resort")?.trim() ?? "";
  const returnTo = searchParams.get("returnTo")?.trim() ?? "";
  /** Marketer referral codes apply to resort-owner signup only. */
  const isOwnerFlow = intentRaw === "owner" || hasReferralRef;
  const isClientFlow = !hasReferralRef && (intentRaw === "client" || Boolean(resortSlug));
  /** Resort slug signup hides marketing nav — use the compact guest shell only then. */
  const isGuestFromResort = isClientFlow && Boolean(resortSlug);
  const needsRolePick = !isOwnerFlow && !isClientFlow;
  const { openRegisterModal } = useRegisterModal();
  const legacyResortBanner = Boolean(resortSlug) && intentRaw !== "client";
  const [resortBrand, setResortBrand] = useState<{
    name: string;
    logoUrl: string | null;
    id?: number;
    backgroundImageUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!resortSlug) {
      setResortBrand(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await publicClient.get<{
          success: boolean;
          data?: { id?: number; name?: string; logoUrl?: string | null; backgroundImageUrl?: string | null };
        }>(`/public/resorts/slug/${encodeURIComponent(resortSlug)}`);
        if (cancelled) return;
        if (data.success && data.data?.name) {
          setResortBrand({
            id: data.data.id,
            name: data.data.name,
            logoUrl: data.data.logoUrl ?? null,
            backgroundImageUrl: data.data.backgroundImageUrl ?? null,
          });
        } else {
          setResortBrand(null);
        }
      } catch {
        if (!cancelled) setResortBrand(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resortSlug]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!needsRolePick) return;
    openRegisterModal({ onClose: () => router.push("/") });
  }, [needsRolePick, openRegisterModal, router]);

  /** Legacy shared links used `/register?ref=` without `intent=owner` — normalize the URL. */
  useEffect(() => {
    if (!hasReferralRef || intentRaw === "owner") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("intent", "owner");
    router.replace(`/register?${params.toString()}`);
  }, [hasReferralRef, intentRaw, router, searchParams]);

  useEffect(() => {
    if (!isOwnerFlow) return;
    const normalized = sanitizeReferralCodeInput(refFromQuery);
    if (!normalized) return;
    let cancelled = false;
    setReferralVerifyModalOpen(true);
    setReferralDraft(normalized);
    void (async () => {
      try {
        const result = await validateReferralCodePublic(normalized);
        if (cancelled) return;
        if (!result.valid) {
          setReferralFieldError(result.message);
          return;
        }
        setAppliedReferral({ code: result.code, marketerName: result.marketer_name });
        setReferralDraft(result.code);
      } catch {
        if (!cancelled) {
          setReferralFieldError("Unable to verify. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setReferralVerifyModalOpen(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refFromQuery, isOwnerFlow]);

  const clearAppliedReferral = () => {
    setAppliedReferral(null);
    setReferralFieldError(null);
  };

  const applyReferralForCode = useCallback(async (codeInput: string) => {
    setReferralFieldError(null);
    const normalized = sanitizeReferralCodeInput(codeInput);
    if (!normalized) {
      setReferralFieldError("Enter a referral code first.");
      return;
    }
    setReferralVerifyModalOpen(true);
    try {
      const result = await validateReferralCodePublic(normalized);
      if (!result.valid) {
        setReferralFieldError(result.message);
        return;
      }
      setAppliedReferral({ code: result.code, marketerName: result.marketer_name });
      setReferralDraft(result.code);
    } catch {
      setReferralFieldError("Unable to verify. Check your connection and try again.");
    } finally {
      setReferralVerifyModalOpen(false);
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError("Please accept the terms and privacy policy to continue.");
      return;
    }
    if (!passwordPolicyMet(getPasswordPolicyChecks(password))) {
      setError("Password does not meet minimum security requirements.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const { user, referralTrial } = await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        business_name: isOwnerFlow ? businessName.trim() || undefined : undefined,
        role_intent: isOwnerFlow ? "resort_owner" : "client",
        signup_source_resort_id: isClientFlow && resortBrand?.id ? resortBrand.id : undefined,
        referral_code: isOwnerFlow && appliedReferral ? appliedReferral.code : undefined,
        password,
        password_confirmation: passwordConfirmation,
        accept_terms: true,
      });
      if (isOwnerFlow && referralTrial?.active) {
        setTrialSuccessModal({
          marketerName: referralTrial.marketer_name ?? appliedReferral?.marketerName ?? "your partner",
          code: referralTrial.code ?? appliedReferral?.code ?? "",
          endsAt: referralTrial.ends_at ?? null,
        });
        return;
      }
      router.push(
        resolveGuestPostAuthPath(user.role, {
          returnTo,
          resortId: resortBrand?.id,
          fromResortGuest: isGuestFromResort,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setPending(false);
    }
  };

  const resortLogoAbs =
    isClientFlow && resortBrand?.logoUrl ? laravelPublicUrl(resortBrand.logoUrl) : "";

  const trialEndLabel =
    trialSuccessModal?.endsAt != null
      ? new Date(trialSuccessModal.endsAt).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  return (
    <AuthSplitShell
      resortHero={
        isGuestFromResort && resortBrand
          ? {
              name: resortBrand.name,
              logoUrl: resortBrand.logoUrl,
              backgroundImageUrl: resortBrand.backgroundImageUrl,
            }
          : null
      }
    >
      {mounted && trialSuccessModal
        ? createPortal(
            <DismissibleModalShell
              open
              onClose={() => setTrialSuccessModal(null)}
              zIndexClass={MARKETING_MODAL_Z_REGISTER}
              layout="bare"
              frameClassName={MARKETING_MODAL_CENTER_FRAME_CLASS}
              backdropClassName="bg-zinc-900/50 backdrop-blur-[2px]"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="register-trial-success-title"
                className="pointer-events-auto w-full max-w-md rounded-2xl border border-emerald-200/80 bg-white p-6 text-center shadow-2xl shadow-zinc-900/20"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Gift className="h-7 w-7" aria-hidden />
                </div>
                <h2 id="register-trial-success-title" className="mt-4 font-heading text-xl font-semibold text-zinc-900">
                  You&apos;re on a 1-month free trial
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Referral <span className="font-mono font-semibold text-zinc-800">{trialSuccessModal.code}</span> from{" "}
                  <span className="font-semibold text-zinc-800">{trialSuccessModal.marketerName}</span> is active. Your
                  platform access is unlocked{trialEndLabel ? ` until ${trialEndLabel}` : ""}.
                </p>
                <button
                  type="button"
                  className="mt-5 w-full rounded-xl bg-gradient-to-r from-clOcean to-clOceanDeep px-4 py-2.5 text-sm font-semibold text-white shadow-md"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to dashboard
                </button>
              </div>
            </DismissibleModalShell>,
            document.body,
          )
        : null}
      {mounted && referralVerifyModalOpen && isOwnerFlow
        ? createPortal(
            <DismissibleModalShell
              open
              onClose={() => {}}
              zIndexClass={MARKETING_MODAL_Z_REGISTER}
              layout="bare"
              frameClassName={MARKETING_MODAL_CENTER_FRAME_CLASS}
              backdropClassName="bg-zinc-900/45 backdrop-blur-[2px]"
              dismissOnBackdrop={false}
              escapeToClose={false}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="register-referral-verify-title"
                aria-busy="true"
                className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/20 bg-white px-6 py-8 text-center shadow-2xl shadow-zinc-900/25"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clOcean/10">
                  <Loader2 className="h-8 w-8 animate-spin text-clOcean" aria-hidden />
                </div>
                <p id="register-referral-verify-title" className="mt-4 font-heading text-lg font-semibold text-zinc-900">
                  Verifying referral code
                </p>
                <p className="mt-1.5 text-sm text-zinc-600">Please wait while we check this code…</p>
              </div>
            </DismissibleModalShell>,
            document.body,
          )
        : null}

      {!needsRolePick ? (
      <div className={cn(AUTH_MARKETING_CARD, "!p-4 sm:!p-5")}>
        {legacyResortBanner ? (
          <p className="mb-3 rounded-lg border border-sky-200/80 bg-sky-50 px-3 py-2 text-center text-xs text-sky-950">
            One account books any verified resort. Register below as a client to continue.
          </p>
        ) : null}
        {isClientFlow && resortSlug ? (
          <p className="mb-3 text-center">
            <Link
              href={`/resort/${encodeURIComponent(resortSlug)}`}
              className="text-xs font-semibold text-clOcean underline-offset-2 hover:underline"
            >
              ← Back to {resortBrand?.name ?? "resort"} page
            </Link>
          </p>
        ) : null}

        <div className="mb-3 flex gap-2.5 sm:mb-2.5 sm:items-center">
          {resortLogoAbs ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm ring-1 ring-zinc-100 sm:h-11 sm:w-11">
              <Image
                src={resortLogoAbs}
                alt={`${resortBrand?.name ?? "Resort"} logo`}
                fill
                className="object-contain p-1"
                sizes="48px"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-clOcean to-clOceanDeep text-white shadow-md shadow-clOcean/25 ring-1 ring-clOcean/20 sm:h-9 sm:w-9">
              <UserPlus size={17} strokeWidth={2} />
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-[1.35rem]">
              {isOwnerFlow
                ? "List your resort"
                : isClientFlow
                  ? resortBrand?.name
                    ? `Book ${resortBrand.name}`
                    : "Create your booker account"
                  : "Create your account"}
            </h1>
            <p className="mt-0.5 text-xs leading-snug text-zinc-600 sm:text-sm sm:leading-snug">
              {isOwnerFlow
                ? "Free verification, listing, and owner tools on Anti-Scam PH."
                : "One account for every verified resort — explore and book anywhere."}
            </p>
          </div>
        </div>

        <div className="max-lg:mb-3 max-lg:rounded-xl max-lg:border max-lg:border-clOcean/12 max-lg:bg-gradient-to-b max-lg:from-sky-50/80 max-lg:to-white max-lg:p-2.5 max-lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] lg:contents">
        <a
          href={googleOAuthRedirectUrl(returnTo || (resortSlug ? `/resort/${resortSlug}` : undefined))}
          className="mb-2 flex w-full min-h-[2.5rem] items-center justify-center gap-2 rounded-lg border border-zinc-200/90 bg-white py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50/90 max-lg:shadow-sm max-lg:active:scale-[0.99] lg:mb-2.5"
        >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
          Continue with Google
        </a>

        <div className="relative mb-0 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-500 lg:mb-2.5">
          <span className="relative z-10 bg-white px-3 max-lg:rounded-full max-lg:bg-white max-lg:px-3 max-lg:shadow-sm">
            or register with email
          </span>
          <span className="absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 bg-zinc-200/90" />
        </div>
        </div>

        <div className="max-lg:rounded-xl max-lg:border max-lg:border-zinc-200/60 max-lg:bg-white max-lg:p-3 max-lg:shadow-[inset_0_2px_8px_rgba(13,30,66,0.04)] lg:contents">
        <form className="space-y-2.5 md:space-y-2" onSubmit={onSubmit}>
          {error ? (
            <p role="alert" className="rounded-lg border border-red-200/90 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="register-name" className="mb-1 block text-[11px] font-semibold text-zinc-700">
              Full name
            </label>
            <input
              id="register-name"
              suppressHydrationWarning
              className={authInput}
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(sanitizePersonName(e.target.value))}
              placeholder="Maria Santos"
            />
          </div>

          <div className={`grid gap-2.5 sm:gap-2 ${isOwnerFlow ? "sm:grid-cols-2" : ""}`}>
            <div>
              <label htmlFor="register-phone" className="mb-1 block text-[11px] font-semibold text-zinc-700">
                Contact number
              </label>
              <input
                id="register-phone"
                suppressHydrationWarning
                className={authInput}
                autoComplete="tel"
                required={isOwnerFlow}
                value={phone}
                onChange={(e) => setPhone(sanitizePhilippinesMobileInput(e.target.value))}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="09XXXXXXXXX"
              />
            </div>
            {isOwnerFlow ? (
            <div>
              <label htmlFor="register-business" className="mb-1 block text-[11px] font-semibold text-zinc-700">
                Resort name
              </label>
              <input
                id="register-business"
                suppressHydrationWarning
                className={authInput}
                value={businessName}
                onChange={(e) => setBusinessName(sanitizeBusinessOrResortName(e.target.value))}
                placeholder="e.g. Sunset Cove Resort"
              />
            </div>
            ) : null}
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1 block text-[11px] font-semibold text-zinc-700">
              Email
            </label>
            <div className="relative">
              <Mail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-clOcean/55" />
              <input
                id="register-email"
                suppressHydrationWarning
                className={`${authInput} pl-10`}
                type="email"
                autoComplete="email"
                required
                value={email}
                inputMode="email"
                onChange={(e) => setEmail(sanitizeEmailTyping(e.target.value).toLowerCase())}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-2 lg:gap-x-3 lg:gap-y-1">
            <div className="min-w-0">
              <label htmlFor="register-password" className="mb-1 block text-[11px] font-semibold text-zinc-700">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-clOcean/55" aria-hidden />
                <input
                  id="register-password"
                  suppressHydrationWarning
                  className={`${authInput} pl-9 ${hydrated ? "pr-10" : "pr-4"}`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, mixed case + number"
                  aria-describedby="password-hint register-password-meter"
                />
                {hydrated ? (
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-500 outline-none transition hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-clOcean/25"
                  >
                    {showPassword ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                  </button>
                ) : (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 h-6 w-6 -translate-y-1/2" aria-hidden />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <label htmlFor="register-confirm" className="mb-1 block text-[11px] font-semibold text-zinc-700">
                Confirm password
              </label>
              <div className="relative">
                <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-clOcean/55" aria-hidden />
                <input
                  id="register-confirm"
                  suppressHydrationWarning
                  className={`${authInput} pl-9 ${hydrated ? "pr-10" : "pr-4"}`}
                  type={showPasswordConfirmation ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Repeat password"
                />
                {hydrated ? (
                  <button
                    type="button"
                    aria-label={showPasswordConfirmation ? "Hide confirmation password" : "Show confirmation password"}
                    aria-pressed={showPasswordConfirmation}
                    onClick={() => setShowPasswordConfirmation((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-500 outline-none transition hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-clOcean/25"
                  >
                    {showPasswordConfirmation ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                  </button>
                ) : (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 h-6 w-6 -translate-y-1/2" aria-hidden />
                )}
              </div>
            </div>

            <p id="password-hint" className="text-[10px] leading-snug text-zinc-500 lg:col-span-2">
              At least 8 characters with uppercase, lowercase, and a number.
            </p>
            <PasswordRequirementsMeter
              className="lg:col-span-2"
              dense
              password={password}
              confirmation={passwordConfirmation}
              id="register-password-meter"
            />
          </div>

          {isOwnerFlow ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="register-referral" className="text-[11px] font-semibold text-zinc-700">
                  Referral code <span className="font-normal text-zinc-500">(optional)</span>
                </label>
                {appliedReferral ? (
                  <button
                    type="button"
                    onClick={clearAppliedReferral}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-clOcean hover:bg-clOcean/10"
                  >
                    <X className="h-3 w-3" aria-hidden />
                    Change
                  </button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <input
                  id="register-referral"
                  suppressHydrationWarning
                  className={cn(authInput, "min-w-0 flex-1 font-mono uppercase tracking-wide")}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={Boolean(appliedReferral)}
                  value={referralDraft}
                  onChange={(e) => setReferralDraft(sanitizeReferralCodeInput(e.target.value))}
                  placeholder="e.g. RODRIGUEZ8391"
                  maxLength={32}
                />
                <button
                  type="button"
                  onClick={() => void applyReferralForCode(referralDraft)}
                  disabled={Boolean(appliedReferral) || referralVerifyModalOpen}
                  className="shrink-0 rounded-lg border border-clOcean/30 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-clOcean shadow-sm transition hover:bg-clSeafoam/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
              {appliedReferral ? (
                <p className="text-[11px] font-medium text-emerald-700">
                  Applied: <span className="font-mono">{appliedReferral.code}</span>
                  <span className="text-zinc-600"> — {appliedReferral.marketerName}</span>
                </p>
              ) : null}
              {referralFieldError && !appliedReferral ? (
                <p role="status" className="text-[11px] font-medium text-red-700">
                  {referralFieldError}
                </p>
              ) : null}
            </div>
          ) : null}

          <label className="flex items-start gap-2 rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-2.5 py-2 text-[11px] leading-snug text-zinc-600 max-lg:bg-white/80">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-zinc-300 text-clOcean focus:ring-clOcean/30"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span>
              I have read and agree to the{" "}
              <LegalLinkButton kind="terms">Terms &amp; Conditions</LegalLinkButton> and{" "}
              <LegalLinkButton kind="privacy">Privacy Policy</LegalLinkButton>
              . A copy of the Terms will be emailed to you after registration.
            </span>
          </label>

          <Button
            type="submit"
            className="w-full justify-center rounded-lg py-2.5 text-sm font-semibold shadow-md shadow-clOcean/20 max-lg:min-h-[2.75rem]"
            disabled={pending || !acceptTerms}
          >
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        </div>

        <p className="mt-2.5 text-center text-xs text-zinc-600 sm:text-sm">
          Already have an account?{" "}
          <Link
            href={buildLoginUrl({
              returnTo: returnTo || (resortSlug ? `/resort/${resortSlug}` : null),
              intent: isClientFlow ? "client" : undefined,
              resortSlug: resortSlug || null,
            })}
            className="font-semibold text-clOcean hover:text-clOceanHover hover:underline"
          >
            Sign in
          </Link>
        </p>

        {isOwnerFlow ? <AuthPageBrandTagline className="mt-3 border-t-0 pt-2 md:mt-2 md:pt-2" /> : null}
      </div>
      ) : null}
    </AuthSplitShell>
  );
}

function RegisterPageFallback() {
  return (
    <AuthSplitShell>
      <div className={cn(AUTH_MARKETING_CARD, "flex min-h-[200px] items-center justify-center !p-4 sm:!p-5")}>
        <Loader2 className="h-8 w-8 animate-spin text-clOcean" aria-label="Loading" />
      </div>
    </AuthSplitShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageFallback />}>
      <RegisterPageInner />
    </Suspense>
  );
}
