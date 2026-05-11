"use client";

import { AuthPageBrandTagline } from "@/components/branding/AuthPageBrandTagline";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { googleOAuthRedirectUrl } from "@/lib/api/baseUrl";
import { useHydrated } from "@/hooks/useHydrated";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { sanitizeEmailTyping } from "@/lib/inputRestrictions";
import DemoQuickLogin from "./DemoQuickLogin";

/**
 * Login card — roomier than the compact auth card used on register/forgot.
 * Same diagonal-striped-brick texture as the shared auth card, supplied via
 * the `.auth-card-bg` component class in globals.css (over an opaque white
 * base, so the pattern reads as subtle texture rather than a full repaint).
 * Distinct from `.auth-paper-bg` (grey-sandbag) used on the page shell, so
 * the card reads as a visually separate surface from the surrounding page.
 */
const loginCardClass =
  "auth-card-bg relative overflow-hidden rounded-3xl border border-zinc-200/75 p-7 shadow-[0_26px_52px_-22px_rgba(13,30,66,0.18),0_0_0_1px_rgba(255,255,255,0.82)_inset] backdrop-blur-xl sm:p-9 md:p-10 " +
  "max-lg:rounded-[1.12rem] max-lg:border-zinc-200/70 max-lg:p-6 " +
  "max-lg:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_10px_32px_-22px_rgba(13,30,66,0.14)] " +
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-[3px] before:bg-gradient-to-r before:from-clOcean before:via-clTeal before:to-sky-400 before:content-[''] before:hidden max-lg:before:block";

const authInput =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-clOcean focus:bg-white focus:ring-2 focus:ring-clOcean/25 max-lg:min-h-[2.875rem] md:text-sm";

function LoginFallback() {
  return (
    <AuthSplitShell>
      <div className={`${loginCardClass} animate-pulse`}>
        <div className="mb-6 h-12 w-12 rounded-2xl bg-zinc-200" />
        <div className="mb-4 h-8 w-3/4 max-w-xs rounded-lg bg-zinc-200" />
        <div className="mb-8 h-4 w-full max-w-sm rounded bg-zinc-100" />
        <div className="space-y-4">
          <div className="h-12 rounded-xl bg-zinc-100" />
          <div className="h-12 rounded-xl bg-zinc-100" />
          <div className="h-12 rounded-xl bg-zinc-200" />
        </div>
        <p className="mt-8 text-center text-sm text-zinc-500">Loading sign-in…</p>
      </div>
    </AuthSplitShell>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();
  const oauthError = searchParams.get("error");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setPending(false);
    }
  };

  const onDemoLogin = async (demoEmail: string, demoPassword: string) => {
    const e = demoEmail.trim();
    setError(null);
    setEmail(e);
    setPassword(demoPassword);
    try {
      await login(e, demoPassword);
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      setError(msg);
      throw err;
    }
  };

  return (
    <>
    <AuthSplitShell>
      <div className={loginCardClass}>
        <div className="mb-6 flex gap-4 sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-clOcean to-clOceanDeep text-white shadow-lg shadow-clOcean/30 ring-1 ring-clOcean/25">
            <LogIn size={22} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem] sm:leading-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-[15px]">
              Sign in to manage bookings and your account.
            </p>
          </div>
        </div>

        <div className="max-lg:mb-5 max-lg:rounded-xl max-lg:border max-lg:border-clOcean/12 max-lg:bg-gradient-to-b max-lg:from-sky-50/80 max-lg:to-white max-lg:p-3 max-lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] lg:contents">
        <a
          href={googleOAuthRedirectUrl()}
          className="mb-3 flex w-full min-h-[2.875rem] items-center justify-center gap-2.5 rounded-xl border border-zinc-200/90 bg-white py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50/90 max-lg:mb-3 max-lg:shadow-md max-lg:shadow-clOcean/10 max-lg:active:scale-[0.99] lg:mb-5 lg:shadow-sm"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </a>

        <div className="relative mb-0 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 max-lg:mb-0 lg:mb-5">
          <span className="relative z-10 bg-white px-3 max-lg:rounded-full max-lg:bg-white max-lg:px-3 max-lg:shadow-sm">or use email</span>
          <span className="absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 bg-zinc-200/90" />
        </div>
        </div>

        <div className="max-lg:rounded-xl max-lg:border max-lg:border-zinc-200/60 max-lg:bg-white max-lg:p-4 max-lg:shadow-[inset_0_2px_8px_rgba(13,30,66,0.04)] lg:contents">
        <form className="space-y-5" onSubmit={onSubmit}>
          {oauthError === "oauth_failed" ? (
            <p role="alert" className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Google sign-in failed. Please try again or sign in with email.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="login-email" className="mb-2 block text-xs font-semibold text-zinc-700">
              Email
            </label>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-clOcean/50" />
              <input
                id="login-email"
                suppressHydrationWarning
                className={`${authInput} pl-11`}
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
            <label htmlFor="login-password" className="mb-2 block text-xs font-semibold text-zinc-700">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-clOcean/50" aria-hidden />
              <input
                id="login-password"
                suppressHydrationWarning
                className={`${authInput} pl-11 ${hydrated ? "pr-11" : "pr-4"}`}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
          </div>

          <div className="-mt-1 flex justify-end pt-0.5">
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-clOcean hover:text-clOceanHover hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="mt-1 w-full justify-center rounded-xl py-3.5 text-sm font-semibold shadow-md shadow-clOcean/20 max-lg:min-h-[3rem] max-lg:active:scale-[0.99]"
            disabled={pending}
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        </div>

        <p className="mt-7 text-center text-sm text-zinc-600">
          No account yet?{" "}
          <Link href="/register" className="font-semibold text-clOcean hover:text-clOceanHover hover:underline">
            Create one
          </Link>
        </p>

        <AuthPageBrandTagline />
      </div>
    </AuthSplitShell>
    <DemoQuickLogin variant="floating" onLoginAs={onDemoLogin} />
    </>
  );
}

/** `useSearchParams` must sit under `Suspense` (Next.js 15) so `/login` and `/login?…` render reliably. */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
