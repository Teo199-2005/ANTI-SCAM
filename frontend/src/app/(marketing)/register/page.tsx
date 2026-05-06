"use client";

import Button from "@/components/ui/Button";
import PageContainer from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { googleOAuthRedirectUrl } from "@/lib/api/baseUrl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Shield, UserPlus } from "lucide-react";

const authInput =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-clOcean focus:ring-2 focus:ring-clOcean/15";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
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
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_55%_at_50%_-15%,rgba(13,30,66,0.11),transparent_50%),radial-gradient(ellipse_55%_45%_at_100%_100%,rgba(26,56,148,0.06),transparent)]"
        aria-hidden
      />
      <PageContainer className="section-padding relative">
        <div className="mx-auto max-w-md">
          <div className="rounded-[1.75rem] border border-zinc-200/90 bg-white/95 p-8 shadow-[0_24px_52px_-18px_rgba(13,30,66,0.18),0_0_0_1px_rgba(255,255,255,0.9)_inset] backdrop-blur-sm md:p-10">
            <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-clOcean">
              Anti-Scam PH
            </p>
            <div className="mb-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-clOcean to-clOceanDeep text-white shadow-lg shadow-clOcean/25">
                <UserPlus size={22} strokeWidth={2} />
              </div>
              <h1 className="mt-5 font-heading text-3xl font-semibold tracking-tight text-zinc-900">Create your account</h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Join to book resorts and track reservations in one place.
              </p>
            </div>

            <a
              href={googleOAuthRedirectUrl()}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>

            <div className="relative mb-5 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <span className="relative z-10 bg-white px-3">or register with email</span>
              <span className="absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 bg-zinc-200" />
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              {error ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  {error}
                </p>
              ) : null}

              <div>
                <label htmlFor="register-name" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Full name
                </label>
                <input
                  id="register-name"
                  className={authInput}
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maria Santos"
                />
              </div>

              <div>
                <label htmlFor="register-email" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Email
                </label>
                <div className="relative">
                  <Mail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-clOcean/55" />
                  <input
                    id="register-email"
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
                <input
                  id="register-password"
                  className={authInput}
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, mixed case + number"
                  aria-describedby="password-hint"
                />
                <p id="password-hint" className="mt-1.5 text-xs text-zinc-500">
                  At least 8 characters with uppercase, lowercase, and a number.
                </p>
              </div>

              <div>
                <label htmlFor="register-confirm" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Confirm password
                </label>
                <input
                  id="register-confirm"
                  className={authInput}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>

              <Button type="submit" className="w-full justify-center rounded-xl py-3" disabled={pending}>
                {pending ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-clOcean hover:text-clOceanHover hover:underline">
                Sign in
              </Link>
            </p>

            <div className="mt-8 flex items-center justify-center gap-2 border-t border-zinc-100 pt-6 text-xs text-zinc-500">
              <Shield size={14} className="shrink-0 text-clOcean/50" aria-hidden />
              <span>Anti-Scam PH · Verified-safe bookings</span>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
