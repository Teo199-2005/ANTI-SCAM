"use client";

import { demoAccounts } from "@/lib/auth/demoAccounts";
import { ChevronDown, ChevronUp, FlaskConical, Loader2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

function subscribeNoop(): () => void {
  return () => {};
}

function snapshotLocalhostDemo(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "127.0.0.1") return true;
  if (/^127\.\d+\.\d+\.\d+$/.test(h)) return true;
  return false;
}

function useLocalhostDemo(): boolean {
  return useSyncExternalStore(subscribeNoop, snapshotLocalhostDemo, () => false);
}

function useDemoPanelEnabled(): { showPanel: boolean; localhostDemo: boolean } {
  const localhostDemo = useLocalhostDemo();
  const vercelPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  // Production deploys (e.g. VPS): never show demo UI. Local: next dev, localhost, Vercel preview only.
  const showPanel =
    process.env.NODE_ENV === "development" || vercelPreview || localhostDemo;
  return { showPanel, localhostDemo };
}

function useBodyMounted(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  return ok;
}

type DemoQuickLoginProps = {
  onLoginAs: (email: string, password: string) => Promise<void>;
  variant?: "inline" | "floating";
};

const FLOAT_Z = "z-[9999]";

export default function DemoQuickLogin({ onLoginAs, variant = "floating" }: DemoQuickLoginProps) {
  const [open, setOpen] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const { showPanel, localhostDemo } = useDemoPanelEnabled();
  const bodyMounted = useBodyMounted();

  const handleRowActivate = async (id: string, email: string, password: string) => {
    if (busyId) return;
    setErrorId(null);
    setBusyId(id);
    try {
      await onLoginAs(email, password);
    } catch {
      setErrorId(id);
    } finally {
      setBusyId(null);
    }
  };

  if (!showPanel) {
    return null;
  }

  const outerClass =
    variant === "floating"
      ? `pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] ${FLOAT_Z} flex max-h-[min(72vh,calc(100dvh-2rem))] w-[min(100vw-2rem,18rem)] flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/95 shadow-[0_20px_50px_-12px_rgba(13,30,66,0.4)] backdrop-blur-2xl backdrop-saturate-150`
      : "w-full rounded-2xl border border-navy/12 bg-gradient-to-b from-sky-50/80 via-white to-white shadow-[0_12px_36px_-20px_rgba(13,30,66,0.2)]";

  const panel = (
    <div className={outerClass} suppressHydrationWarning>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          variant === "floating"
            ? "flex w-full shrink-0 cursor-pointer items-center justify-between gap-2 border-b border-white/35 bg-navy/90 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white transition hover:bg-navy"
            : "flex w-full cursor-pointer items-center justify-between gap-2 rounded-t-2xl border-b border-navy/10 bg-navy px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white transition hover:bg-navy/95"
        }
      >
        <span className="inline-flex items-center gap-2">
          <FlaskConical size={14} />
          Demo accounts
        </span>
        {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>

      {open && (
        <div className={`min-h-0 p-3 ${variant === "floating" ? "overflow-y-auto overscroll-contain" : ""}`}>
          <p className="mb-2.5 text-xs leading-relaxed text-zinc-600">
            <strong className="text-zinc-800">Tap a role</strong> to fill the form, sign you in, and open the dashboard.
            Password for all:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-800">password</code>
            {process.env.NODE_ENV === "production" && (localhostDemo || process.env.NEXT_PUBLIC_VERCEL_ENV === "preview") ? (
              <span className="block pt-1 text-[11px] font-normal text-amber-800">
                Demo logins on this build — use only for testing; production apex should turn demos off.
              </span>
            ) : null}
          </p>

          <div className="flex flex-col gap-1.5">
            {demoAccounts.map((acc) => {
              const isBusy = busyId === acc.id;
              const hasError = errorId === acc.id;

              return (
                <button
                  key={acc.id}
                  type="button"
                  disabled={busyId !== null}
                  aria-label={`Sign in as ${acc.label}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleRowActivate(acc.id, acc.email, acc.password);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`
                    pointer-events-auto cursor-pointer
                    group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left
                    shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60
                    ${
                      hasError
                        ? "border-red-300 bg-red-50/80 text-red-900"
                        : isBusy
                          ? "border-navy/40 bg-navy/10 text-zinc-900"
                          : "border-zinc-200/90 bg-white text-zinc-800 hover:border-navy/25 hover:bg-sky-50/50"
                    }
                  `}
                >
                  <span
                    className={`
                    flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold
                    ${hasError ? "border-red-300 bg-red-100 text-red-700" : "border-zinc-200 bg-white text-navy"}
                  `}
                  >
                    {isBusy ? (
                      <Loader2 size={13} className="animate-spin text-navy" />
                    ) : hasError ? (
                      "!"
                    ) : acc.id === "admin" ? (
                      "A"
                    ) : acc.id === "owner" ? (
                      "O"
                    ) : acc.id === "marketing" ? (
                      "M"
                    ) : (
                      acc.label.charAt(0).toUpperCase()
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold leading-tight text-zinc-900">{acc.label}</span>
                    <span className="block truncate font-mono text-xs font-normal text-zinc-500">{acc.email}</span>
                    {hasError && (
                      <span className="block text-xs font-medium text-red-700">
                        Login failed — run the backend, seed DB, check password is &quot;password&quot;.
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-2.5 text-[11px] leading-relaxed text-zinc-500">
            Seed the database:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">php artisan migrate:fresh --seed</code>
            <br />
            If only demo logins are missing:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">php artisan db:seed --class=DemoLoginAccountsSeeder</code>{" "}
            then{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">MarketingPartnerDemoSeeder</code>
          </p>
        </div>
      )}
    </div>
  );

  if (variant === "floating" && bodyMounted && typeof document !== "undefined") {
    return createPortal(panel, document.body);
  }

  return panel;
}
