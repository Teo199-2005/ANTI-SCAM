"use client";

import { AuthSplitShell, AUTH_MARKETING_CARD } from "@/components/auth/AuthSplitShell";
import Button from "@/components/ui/Button";
import { useHydrated } from "@/hooks/useHydrated";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PasswordRequirementsMeter from "@/components/auth/PasswordRequirementsMeter";
import { sanitizeEmailTyping, sanitizeOtpInput } from "@/lib/inputRestrictions";
import { getPasswordPolicyChecks, passwordPolicyMet } from "@/lib/passwordStrength";
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, Shield } from "lucide-react";

const authInput =
  "w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-clOcean focus:ring-2 focus:ring-clOcean/20 md:text-sm";

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldownHint, setCooldownHint] = useState<string | null>(null);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setCooldownHint(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        data?: { expires_at?: string | null; cooldown_seconds?: number | null };
      };
      if (!res.ok || !data.success) {
        setError(data.message ?? "Could not send reset code.");
        return;
      }
      setInfo(data.message ?? "Check your email for a 6-digit code.");
      if (data.data?.cooldown_seconds && data.data.cooldown_seconds > 0) {
        setCooldownHint(`You can request another code in about ${data.data.cooldown_seconds}s.`);
      }
      setStep("reset");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
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
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.replace(/\D/g, "").slice(0, 6),
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (!res.ok || !data.success) {
        const fromErrors =
          data.errors &&
          (Object.values(data.errors).find((a) => Array.isArray(a) && a[0]) as string[] | undefined);
        setError(fromErrors?.[0] ?? data.message ?? "Could not reset password.");
        return;
      }
      setInfo(data.message ?? "Password updated. Redirecting to sign in…");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthSplitShell>
      <div className={AUTH_MARKETING_CARD}>
        <Link
          href="/login"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-clOcean hover:text-clOceanHover hover:underline"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <div className="mb-3 flex gap-3 sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-clOcean to-clOceanDeep text-white shadow-md shadow-clOcean/25 ring-1 ring-clOcean/20">
            <KeyRound size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">Reset password</h1>
            <p className="mt-0.5 text-sm leading-snug text-zinc-600">
              {step === "email"
                ? "We’ll email a one-time code to verify it’s you."
                : "Enter the code and choose a new password."}
            </p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mb-3 rounded-lg border border-red-200/90 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {info ? (
          <p
            role="status"
            className="mb-3 rounded-lg border border-emerald-200/90 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          >
            {info}
          </p>
        ) : null}
        {cooldownHint && step === "reset" ? <p className="mb-3 text-xs text-zinc-500">{cooldownHint}</p> : null}

        {step === "email" ? (
          <form className="space-y-3" onSubmit={sendCode}>
            <div>
              <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-clOcean/55" />
                <input
                  id="forgot-email"
                  className={`${authInput} pl-10`}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(sanitizeEmailTyping(e.target.value).toLowerCase())}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <Button type="submit" className="w-full justify-center rounded-lg py-2.5 text-sm shadow-md shadow-clOcean/15" disabled={pending}>
              {pending ? "Sending…" : "Send reset code"}
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={resetPassword}>
            <div>
              <label htmlFor="forgot-otp" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                6-digit code
              </label>
              <input
                id="forgot-otp"
                className={`${authInput} font-mono tracking-[0.35em]`}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(sanitizeOtpInput(e.target.value))}
                placeholder="000000"
              />
            </div>
            <div>
              <label htmlFor="forgot-password" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                New password
              </label>
              <div className="relative">
                <input
                  id="forgot-password"
                  className={`${authInput} ${hydrated ? "pr-11" : "pr-4"}`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  aria-describedby="forgot-password-hint forgot-password-meter"
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
              <p id="forgot-password-hint" className="mt-1 text-xs text-zinc-500">
                At least 8 characters with uppercase, lowercase, and a number.
              </p>
            </div>
            <div>
              <label htmlFor="forgot-password-2" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="forgot-password-2"
                  className={`${authInput} ${hydrated ? "pr-11" : "pr-4"}`}
                  type={showPassword2 ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Repeat password"
                />
                {hydrated ? (
                  <button
                    type="button"
                    aria-label={showPassword2 ? "Hide password" : "Show password"}
                    aria-pressed={showPassword2}
                    onClick={() => setShowPassword2((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-500 outline-none transition hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-clOcean/25"
                  >
                    {showPassword2 ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  </button>
                ) : (
                  <span className="pointer-events-none absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2" aria-hidden />
                )}
              </div>
            </div>
            <PasswordRequirementsMeter
              password={password}
              confirmation={passwordConfirmation}
              id="forgot-password-meter"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                className="rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                disabled={pending}
                onClick={() => {
                  setStep("email");
                  setError(null);
                  setOtp("");
                  setPassword("");
                  setPasswordConfirmation("");
                }}
              >
                Change email
              </button>
              <Button
                type="submit"
                className="w-full justify-center rounded-lg py-2.5 text-sm shadow-md shadow-clOcean/15 sm:w-auto sm:min-w-[180px]"
                disabled={pending}
              >
                {pending ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500">
          <Shield size={14} className="shrink-0 text-clOcean/50" aria-hidden />
          <span>Anti-Scam PH · Verified-safe bookings</span>
        </div>
      </div>
    </AuthSplitShell>
  );
}
