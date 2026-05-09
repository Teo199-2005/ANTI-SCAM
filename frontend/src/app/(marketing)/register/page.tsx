"use client";

import { AuthSplitShell, AUTH_MARKETING_CARD } from "@/components/auth/AuthSplitShell";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useHydrated } from "@/hooks/useHydrated";
import { googleOAuthRedirectUrl } from "@/lib/api/baseUrl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Mail, Shield, UserPlus, XCircle } from "lucide-react";

const authInput =
  "w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-clOcean focus:ring-2 focus:ring-clOcean/20";

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

  const pwdChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    match: password.length > 0 && password === passwordConfirmation,
  };

  const passedCount = Object.values(pwdChecks).filter(Boolean).length;
  const strengthLabel = passedCount <= 2 ? "Weak" : passedCount <= 4 ? "Good" : "Strong";
  const strengthClass =
    passedCount <= 2 ? "bg-rose-500" : passedCount <= 4 ? "bg-amber-500" : "bg-emerald-500";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError("Please accept the terms and privacy policy to continue.");
      return;
    }
    if (!pwdChecks.length || !pwdChecks.upper || !pwdChecks.lower || !pwdChecks.number) {
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
        <div className="mb-3 flex gap-3 sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-clOcean to-clOceanDeep text-white shadow-md shadow-clOcean/25 ring-1 ring-clOcean/20">
            <UserPlus size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">Create your account</h1>
            <p className="mt-0.5 text-sm leading-snug text-zinc-600">
              Book resorts and track reservations in one place.
            </p>
          </div>
        </div>

        <a
          href={googleOAuthRedirectUrl()}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200/90 bg-white py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50/90"
        >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
          Continue with Google
        </a>

        <div className="relative mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          <span className="relative z-10 bg-white/95 px-2">or register with email</span>
          <span className="absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 bg-zinc-200" />
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
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
              onChange={(e) => setName(e.target.value)}
              placeholder="Maria Santos"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
                onChange={(e) => setPhone(e.target.value)}
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
                onChange={(e) => setBusinessName(e.target.value)}
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                suppressHydrationWarning
                className={`${authInput} ${hydrated ? "pr-11" : "pr-4"}`}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, mixed case + number"
                aria-describedby="password-hint"
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
            <div className="mt-2 rounded-lg border border-zinc-200/90 bg-zinc-50/90 p-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-700">Strength: {strengthLabel}</p>
                <span className="shrink-0 text-[11px] text-zinc-500">{passedCount}/5</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200">
                <div className={`h-full ${strengthClass}`} style={{ width: `${(passedCount / 5) * 100}%` }} />
              </div>
              <ul className="mt-2 grid gap-0.5 text-[11px] text-zinc-600 sm:grid-cols-2">
                {[
                  { ok: pwdChecks.length, label: "At least 8 characters" },
                  { ok: pwdChecks.upper, label: "Contains uppercase letter" },
                  { ok: pwdChecks.lower, label: "Contains lowercase letter" },
                  { ok: pwdChecks.number, label: "Contains a number" },
                  { ok: pwdChecks.match, label: "Passwords match" },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-1.5">
                    {item.ok ? (
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    ) : (
                      <XCircle size={14} className="text-zinc-400" />
                    )}
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <label htmlFor="register-confirm" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="register-confirm"
                suppressHydrationWarning
                className={`${authInput} ${hydrated ? "pr-11" : "pr-4"}`}
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

          <label className="flex items-start gap-2 rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-2.5 py-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-clOcean focus:ring-clOcean/30"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="font-semibold text-clOcean hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-clOcean hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <Button
            type="submit"
            className="w-full justify-center rounded-lg py-2.5 text-sm shadow-md shadow-clOcean/15"
            disabled={pending || !acceptTerms}
          >
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-clOcean hover:text-clOceanHover hover:underline">
            Sign in
          </Link>
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500">
          <Shield size={14} className="shrink-0 text-clOcean/50" aria-hidden />
          <span>Anti-Scam PH · Verified-safe bookings</span>
        </div>
      </div>
    </AuthSplitShell>
  );
}
