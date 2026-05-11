"use client";

import { AuthPageBrandTagline } from "@/components/branding/AuthPageBrandTagline";
import { AuthSplitShell, AUTH_MARKETING_CARD } from "@/components/auth/AuthSplitShell";
import PasswordRequirementsMeter from "@/components/auth/PasswordRequirementsMeter";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useHydrated } from "@/hooks/useHydrated";
import { googleOAuthRedirectUrl } from "@/lib/api/baseUrl";
import { LegalLinkButton } from "@/components/legal/LegalLinkButton";
import {
  sanitizeBusinessOrResortName,
  sanitizeEmailTyping,
  sanitizePersonName,
  sanitizePhilippinesMobileInput,
} from "@/lib/inputRestrictions";
import { getPasswordPolicyChecks, passwordPolicyMet } from "@/lib/passwordStrength";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, UserPlus } from "lucide-react";

const authInput =
  "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-clOcean focus:ring-2 focus:ring-clOcean/20 max-lg:min-h-[2.875rem] md:rounded-lg md:py-2 md:text-sm";

export default function RegisterPage() {
  const router = useRouter();
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
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        business_name: businessName.trim() || undefined,
        role_intent: "resort_owner",
        password,
        password_confirmation: passwordConfirmation,
        accept_terms: true,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthSplitShell>
      <div className={AUTH_MARKETING_CARD}>
        <div className="mb-4 flex gap-3 sm:mb-3 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-clOcean to-clOceanDeep text-white shadow-md shadow-clOcean/25 ring-1 ring-clOcean/20 sm:h-10 sm:w-10">
            <UserPlus size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="font-heading text-[1.35rem] font-semibold leading-tight tracking-tight text-zinc-900 sm:text-2xl">
              Create your account
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 sm:mt-0.5 sm:leading-snug">
              Book resorts and track reservations in one place.
            </p>
          </div>
        </div>

        <div className="max-lg:mb-4 max-lg:rounded-xl max-lg:border max-lg:border-clOcean/12 max-lg:bg-gradient-to-b max-lg:from-sky-50/80 max-lg:to-white max-lg:p-3 max-lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] lg:contents">
        <a
          href={googleOAuthRedirectUrl()}
          className="mb-3 flex w-full min-h-[2.875rem] items-center justify-center gap-2 rounded-xl border border-zinc-200/90 bg-white py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50/90 max-lg:mb-3 max-lg:shadow-md max-lg:shadow-clOcean/10 max-lg:active:scale-[0.99] lg:mb-3 lg:shadow-sm md:rounded-lg md:py-2"
        >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
          Continue with Google
        </a>

        <div className="relative mb-0 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500 lg:mb-3">
          <span className="relative z-10 bg-white px-3 max-lg:rounded-full max-lg:bg-white max-lg:px-3 max-lg:shadow-sm">
            or register with email
          </span>
          <span className="absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 bg-zinc-200/90" />
        </div>
        </div>

        <div className="max-lg:rounded-xl max-lg:border max-lg:border-zinc-200/60 max-lg:bg-white max-lg:p-4 max-lg:shadow-[inset_0_2px_8px_rgba(13,30,66,0.04)] lg:contents">
        <form className="space-y-4 md:space-y-3" onSubmit={onSubmit}>
          {error ? (
            <p role="alert" className="rounded-lg border border-red-200/90 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-xs font-semibold text-zinc-700">
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

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
            <div>
              <label htmlFor="register-phone" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Contact number
              </label>
              <input
                id="register-phone"
                suppressHydrationWarning
                className={authInput}
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(sanitizePhilippinesMobileInput(e.target.value))}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="09XXXXXXXXX"
              />
            </div>
            <div>
              <label htmlFor="register-business" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Business name
              </label>
              <input
                id="register-business"
                suppressHydrationWarning
                className={authInput}
                value={businessName}
                onChange={(e) => setBusinessName(sanitizeBusinessOrResortName(e.target.value))}
                placeholder="Sample Staycation OPC"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-xs font-semibold text-zinc-700">
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

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Password
            </label>
            <div className="relative">
              <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-clOcean/55" aria-hidden />
              <input
                id="register-password"
                suppressHydrationWarning
                className={`${authInput} pl-10 ${hydrated ? "pr-11" : "pr-4"}`}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-500 outline-none transition hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-clOcean/25"
                >
                  {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              ) : (
                <span className="pointer-events-none absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2" aria-hidden />
              )}
            </div>
            <p id="password-hint" className="mt-1 text-xs text-zinc-500">
              At least 8 characters with uppercase, lowercase, and a number.
            </p>
            <PasswordRequirementsMeter
              className="mt-2"
              password={password}
              confirmation={passwordConfirmation}
              id="register-password-meter"
            />
          </div>

          <div>
            <label htmlFor="register-confirm" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Confirm password
            </label>
            <div className="relative">
              <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-clOcean/55" aria-hidden />
              <input
                id="register-confirm"
                suppressHydrationWarning
                className={`${authInput} pl-10 ${hydrated ? "pr-11" : "pr-4"}`}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-500 outline-none transition hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-clOcean/25"
                >
                  {showPasswordConfirmation ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              ) : (
                <span className="pointer-events-none absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2" aria-hidden />
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-zinc-50/90 px-3 py-3 text-xs leading-relaxed text-zinc-600 max-lg:bg-white/80 md:gap-2 md:rounded-lg md:px-2.5 md:py-2">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-clOcean focus:ring-clOcean/30"
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
            className="w-full justify-center rounded-xl py-3.5 text-sm font-semibold shadow-md shadow-clOcean/20 max-lg:min-h-[3rem] md:rounded-lg md:py-2.5"
            disabled={pending || !acceptTerms}
          >
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        </div>

        <p className="mt-4 text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-clOcean hover:text-clOceanHover hover:underline">
            Sign in
          </Link>
        </p>

        <AuthPageBrandTagline />
      </div>
    </AuthSplitShell>
  );
}
