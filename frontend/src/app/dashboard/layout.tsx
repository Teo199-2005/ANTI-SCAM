"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import PoweredByMark from "@/components/branding/PoweredByMark";
import AppLoadingScreen from "@/components/layout/AppLoadingScreen";
import { useToast } from "@/components/shared/ToastProvider";
import { useAuth } from "@/contexts/AuthContext";
import { sendEmailVerificationOtp, verifyEmailVerificationOtp } from "@/lib/api/emailOtp";
import { AlertCircle, ArrowLeft, CheckCircle2, LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { sanitizeOtpInput } from "@/lib/inputRestrictions";
import { cn } from "@/lib/utils";
import { ResortRegistrationWizard } from "@/components/onboarding/ResortRegistrationWizard";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_SEND_TIMEOUT_MS = 15000;

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, refreshUser, logout } = useAuth();
  const { pushToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [autoSendAttempted, setAutoSendAttempted] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);
  const autoSendStartedRef = useRef(false);
  const [sendMode, setSendMode] = useState<"auto" | "manual" | null>(null);

  const needsOtpVerification = useMemo(() => {
    if (!user) return false;
    return ["resort_owner", "marketing"].includes(user.role) && !user.email_verified_at;
  }, [user]);

  const needsRegistrationWizard = useMemo(() => {
    if (!user || user.role !== "resort_owner" || needsOtpVerification) return false;
    if (user.registration_wizard_enabled === false) return false;
    if (user.registration_status !== "complete") return true;
    if (user.verification_status === "rejected" || user.verification_status === "needs_documents") {
      return true;
    }
    if (user.verification_status === "pending" && !user.verification_submitted_at) return true;
    return false;
  }, [user, needsOtpVerification]);

  const displayEmail = user?.email?.toLowerCase() ?? "";

  const startResendCooldown = () => {
    setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
  };

  const applyCooldownFromPayload = (cooldownSeconds: number | null | undefined) => {
    const fromServer =
      typeof cooldownSeconds === "number" && cooldownSeconds > 0 ? Math.floor(cooldownSeconds) : 0;
    setResendCooldown(Math.max(OTP_RESEND_COOLDOWN_SECONDS, fromServer));
  };

  const sendOtpWithTimeout = async () => {
    return Promise.race([
      sendEmailVerificationOtp(),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("OTP send timed out. Please retry.")), OTP_SEND_TIMEOUT_MS);
      }),
    ]);
  };

  const notifyVerificationEmailSent = useCallback(
    (payload: { message: string }) => {
      const m = payload.message;
      if (/verification code sent/i.test(m)) {
        pushToast({
          tone: "success",
          title: "Verification email sent",
          description: displayEmail
            ? `We sent a 6-digit code to ${displayEmail}. Check your inbox and spam folder.`
            : "We sent a 6-digit code to your email. Check your inbox and spam folder.",
          durationMs: 5500,
        });
        return;
      }
      if (/already sent|wait before requesting/i.test(m)) {
        pushToast({
          tone: "info",
          title: "Code already sent",
          description: m,
          durationMs: 5000,
        });
        return;
      }
      if (/processing/i.test(m)) {
        pushToast({
          tone: "info",
          title: "Please wait",
          description: m,
          durationMs: 4000,
        });
        return;
      }
      pushToast({
        tone: "success",
        title: "Verification email sent",
        description: m,
        durationMs: 5500,
      });
    },
    [displayEmail, pushToast],
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const defaultByRole: Record<string, string> = {
      admin: "/dashboard/admin",
      resort_owner: "/dashboard/resort",
      marketing: "/dashboard/marketing",
      admin_staff: "/dashboard/staff",
      client: "/dashboard/client",
      user: "/dashboard/client",
      guest: "/dashboard/client",
    };

    const allowedPrefixByRole: Record<string, string> = {
      admin: "/dashboard/admin",
      resort_owner: "/dashboard/resort",
      marketing: "/dashboard/marketing",
      admin_staff: "/dashboard/staff",
      client: "/dashboard/client",
      user: "/dashboard/client",
      guest: "/dashboard/client",
    };

    const allowedPrefix = allowedPrefixByRole[user.role];
    if (!allowedPrefix || pathname === "/dashboard") return;
    if (!pathname.startsWith(allowedPrefix)) {
      router.replace(defaultByRole[user.role] ?? "/dashboard");
    }
  }, [loading, pathname, router, user]);

  useEffect(() => {
    if (!needsOtpVerification) return;
    if (sendingOtp || otpExpiresAt || autoSendAttempted || autoSendStartedRef.current) return;

    let alive = true;
    autoSendStartedRef.current = true;
    setAutoSendAttempted(true);
    setSendingOtp(true);
    setSendMode("auto");
    setOtpError(null);
    setOtpMessage(null);

    sendOtpWithTimeout()
      .then((payload) => {
        if (!alive) return;
        setOtpExpiresAt(payload.expires_at);
        setOtpMessage(payload.message);
        // Keep Resend usable right after first load; 60s cooldown only after manual resend.
        setResendCooldown(0);
        notifyVerificationEmailSent(payload);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const message = err instanceof Error ? err.message : "Failed to send verification code.";
        setOtpError(message);
      })
      .finally(() => {
        if (!alive) return;
        setSendingOtp(false);
        setSendMode(null);
      });

    return () => {
      alive = false;
    };
  }, [needsOtpVerification, sendingOtp, otpExpiresAt, autoSendAttempted, notifyVerificationEmailSent]);

  useEffect(() => {
    if (needsOtpVerification) return;
    setAutoSendAttempted(false);
    setResendCooldown(0);
    autoSendStartedRef.current = false;
    setSendMode(null);
  }, [needsOtpVerification]);

  // Single ticking interval while OTP gate is shown (avoid deps on `resendCooldown` — that
  // recreated the timer every second and made the countdown stall / Resend feel stuck).
  useEffect(() => {
    if (!needsOtpVerification) return;
    const id = window.setInterval(() => {
      setResendCooldown((current) => (current <= 0 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [needsOtpVerification]);

  const resendDisabled = (sendingOtp && sendMode === "manual") || resendCooldown > 0;

  const handleResendOtp = async () => {
    if (resendDisabled) return;
    setSendingOtp(true);
    setSendMode("manual");
    setOtpError(null);
    setOtpMessage(null);
    try {
      const payload = await sendOtpWithTimeout();
      setOtpExpiresAt(payload.expires_at);
      setOtpMessage(payload.message);
      applyCooldownFromPayload(payload.cooldown_seconds);
      notifyVerificationEmailSent(payload);
    } catch (err: unknown) {
      setOtpError(parseApiErrorMessage(err, "We could not send the code. Wait a moment and try again."));
    } finally {
      setSendingOtp(false);
      setSendMode(null);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);
    setOtpMessage(null);
    try {
      const payload = await verifyEmailVerificationOtp(otp.trim());
      setOtpMessage(payload.message);
      setOtp("");
      await refreshUser();
      router.refresh();
    } catch (err: unknown) {
      setOtpError(parseApiErrorMessage(err, "That code did not work. Check the email and try again."));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleBackToHome = async () => {
    try {
      await logout();
    } finally {
      router.replace("/");
    }
  };

  if (loading) {
    return <AppLoadingScreen variant="dashboard" message="Signing you in…" />;
  }

  if (!user) {
    return (
      <AppLoadingScreen
        message="Redirecting…"
        submessage="Checking access and routing your session."
      />
    );
  }

  // Let /dashboard page handle role-based redirect (and show fullscreen loader there).
  const registrationWizardOverlay =
    needsRegistrationWizard && user?.role === "resort_owner" ? (
      <ResortRegistrationWizard
        verificationOnly={
          user.registration_status === "complete" && user.verification_status === "rejected"
        }
        onComplete={() => {
          void refreshUser();
          router.refresh();
        }}
      />
    ) : null;

  if (pathname === "/dashboard") {
    return (
      <>
        {children}
        {registrationWizardOverlay}
      </>
    );
  }

  if (needsOtpVerification) {
    return (
      <div className="dash-shell flex min-h-screen items-center justify-center px-4 py-8 md:py-12">
        <button
          type="button"
          onClick={() => void handleBackToHome()}
          className="fixed left-4 top-4 z-[250] inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-900 md:left-6 md:top-6"
        >
          <ArrowLeft size={15} />
          Back to home
        </button>
        <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/60 bg-white/90 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="grid md:grid-cols-[1.05fr_1.35fr]">
            <aside className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-6 py-7 text-white md:border-b-0 md:border-r md:border-slate-700/60 md:px-7 md:py-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-sky-300/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <Image
                    src="/branding/mainlogo.png"
                    alt="Anti-Scam PH"
                    width={62}
                    height={62}
                    className="h-14 w-14 rounded-xl border border-white/30 bg-white/95 p-1 object-contain"
                    unoptimized
                    priority
                  />
                  <div>
                    <div className="text-slate-200">
                      <BrandWordmark tone="onDark" size="xs" />
                    </div>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-white">Secure Email Verification</p>
                  </div>
                </div>

                <div className="my-6 h-px bg-white/20" />

                <p className="text-sm leading-relaxed text-slate-200">
                  Protecting resort owners and marketing partners from account misuse through secure OTP verification.
                </p>

                <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Powered by</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/30 bg-white/95 p-1">
                      <Image
                        src="/branding/rising2brothers.png"
                        alt="The Rising 2 Brothers OPC"
                        width={30}
                        height={30}
                        className="h-6 w-6 object-contain"
                        unoptimized
                      />
                    </span>
                    <span className="text-sm font-medium text-white">The Rising 2 Brothers OPC</span>
                  </div>
                </div>
              </div>
            </aside>

            <section className="space-y-5 bg-white px-6 py-7 md:px-8 md:py-8">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700">
                <LockKeyhole className="h-5 w-5" />
              </div>

              <div>
                <h1 className="font-dash text-[30px] leading-tight font-semibold tracking-tight text-slate-900">
                  Email verification required
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  For account security, verify your email first before accessing the dashboard.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <MailCheck className="h-4 w-4 text-slate-600" />
                  <span>
                    Verification code sent to <strong>{displayEmail}</strong>
                  </span>
                </div>
                {otpExpiresAt ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Expires at {new Date(otpExpiresAt).toLocaleString()}
                  </p>
                ) : null}
              </div>

              <div className="h-px bg-slate-200" />

              <form className="space-y-3.5" onSubmit={handleVerifyOtp}>
                <label htmlFor="email-otp-input" className="text-sm font-medium text-slate-700">
                  Enter 6-digit OTP
                </label>
                <input
                  id="email-otp-input"
                  value={otp}
                  onChange={(event) => setOtp(sanitizeOtpInput(event.target.value))}
                  inputMode="numeric"
                  pattern="\d{6}"
                  autoComplete="one-time-code"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 font-mono text-lg tracking-[0.45em] text-slate-900 outline-none ring-slate-200 transition placeholder:text-slate-300 focus:border-slate-500 focus:ring"
                  placeholder="000000"
                />
                {otpError ? (
                  <p className="flex items-center gap-2 text-sm text-rose-600">
                    <AlertCircle className="h-4 w-4" />
                    {otpError}
                  </p>
                ) : null}
                {otpMessage ? (
                  <p className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {otpMessage}
                  </p>
                ) : null}
                <div className="grid gap-2 pt-1 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={verifyingOtp}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verifyingOtp ? "Confirming..." : "Confirm OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendDisabled}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingOtp && sendMode === "manual"
                      ? "Sending..."
                      : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend OTP"}
                  </button>
                </div>
              </form>

              <div className="h-px bg-slate-200" />
              <p className="text-center text-xs text-slate-500">
                <BrandWordmark tone="onLight" size="xs" className="mr-1 inline" /> is a product and service operated by
                The Rising 2 Brothers OPC.
              </p>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const lockDashboardScroll = Boolean(registrationWizardOverlay);

  return (
    <div
      className={cn(
        "dash-shell flex min-h-screen",
        lockDashboardScroll && "h-[100dvh] max-h-[100dvh] overflow-hidden",
      )}
    >
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          lockDashboardScroll ? "h-full overflow-hidden" : "min-h-screen",
          user?.role === "admin" ? "md:pl-[252px]" : "md:pl-[264px]",
        )}
      >
        <DashboardTopbar onOpenMenu={() => setSidebarOpen(true)} />
        <main
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-x-hidden px-4 py-6 lg:px-8 lg:py-8",
            lockDashboardScroll ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          <div className="dash-shell-main">{children}</div>
        </main>
        <footer className="relative border-t border-white/55 bg-gradient-to-b from-white/92 via-softGray/35 to-metalFace/75 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md lg:px-8 lg:pb-3 lg:pt-3">
          <div className="dash-shell-main">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-4 shadow-[0_8px_24px_-12px_rgba(13,30,66,0.12)] sm:flex-row sm:justify-end sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
              <PoweredByMark
                compact
                tone="dark"
                variant="stack"
                showOperatorLogo={false}
                version={process.env.NEXT_PUBLIC_APP_VERSION ?? "v1.0"}
              />
            </div>
          </div>
        </footer>
      </div>
      {registrationWizardOverlay}
    </div>
  );
}
