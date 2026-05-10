"use client";

import { demoAccounts } from "@/lib/auth/demoAccounts";
import { ChevronDown, ChevronUp, FlaskConical, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  const [bffTarget, setBffTarget] = useState<string | null>(null);
  /** Sync mutex — avoids overlapping demo taps / Strict Mode double-calls before React state updates. */
  const demoBusyRef = useRef(false);
  const { showPanel, localhostDemo } = useDemoPanelEnabled();
  const bodyMounted = useBodyMounted();

  useEffect(() => {
    if (!showPanel) return;
    let cancelled = false;
    void fetch("/api/auth/proxy-target")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: unknown) => {
        const api =
          j && typeof j === "object" && j !== null && "laravelApiV1" in j && typeof (j as { laravelApiV1: unknown }).laravelApiV1 === "string"
            ? (j as { laravelApiV1: string }).laravelApiV1
            : null;
        if (!cancelled && api) setBffTarget(api);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showPanel]);

  const handleRowActivate = async (id: string, email: string, password: string) => {
    if (busyId || demoBusyRef.current) return;
    demoBusyRef.current = true;
    setErrorId(null);
    setBusyId(id);
    try {
      await onLoginAs(email, password);
    } catch {
      setErrorId(id);
    } finally {
      demoBusyRef.current = false;
      setBusyId(null);
    }
  };

  if (!showPanel) {
    return null;
  }

  /** Floating widget is portaled; skip SSR + first paint so browser extensions can't inject attrs (e.g. fdprocessedid) before hydrate. */
  if (variant === "floating" && !bodyMounted) {
    return null;
  }

  const outerClass =
    variant === "floating"
      ? `pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] ${FLOAT_Z} flex max-h-[min(72vh,calc(100dvh-2rem))] w-[min(100vw-2rem,20rem)] flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/95 shadow-[0_20px_50px_-12px_rgba(13,30,66,0.4)] backdrop-blur-2xl backdrop-saturate-150`
      : "w-full rounded-2xl border border-navy/12 bg-gradient-to-b from-sky-50/80 via-white to-white shadow-[0_12px_36px_-20px_rgba(13,30,66,0.2)]";

  const panel = (
    <div className={outerClass}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          variant === "floating"
            ? "flex w-full shrink-0 cursor-pointer items-center justify-between gap-2 border-b border-white/35 bg-navy/90 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white transition hover:bg-navy"
            : "flex w-full cursor-pointer items-center justify-between gap-2 rounded-t-2xl border-b border-navy/10 bg-navy px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white transition hover:bg-navy/95"
        }
      >
        <span className="flex items-start gap-2 text-left">
          <FlaskConical size={14} className="mt-0.5 shrink-0 opacity-90" />
          <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
            <span>Demo accounts</span>
            <span className="text-[10px] font-semibold normal-case tracking-normal text-white/80">
              Anti-Scam PH · Console
            </span>
          </span>
        </span>
        {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>

      {open && (
        <div className={`min-h-0 p-3 ${variant === "floating" ? "overflow-y-auto overscroll-contain" : ""}`}>
          <p className="mb-2 text-[11px] font-semibold leading-snug text-navy">
            Anti-Scam PH — anti booking scam of resorts
          </p>
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
            {bffTarget ? (
              <>
                <span className="font-medium text-zinc-700">BFF Laravel API:</span>{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">{bffTarget}</code>
                <br />
              </>
            ) : null}
            Seed the database:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">php artisan migrate:fresh --seed</code>
            <br />
            If only demo logins are missing:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">php artisan db:seed --class=DemoLoginAccountsSeeder</code>{" "}
            (creates admin, owner, guest, user, two marketers including Charlie Santiago / CHARLIE01). For marketer↔resort links run{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">MarketingPartnerDemoSeeder</code> too.
            <br />
            If login fails after changing the API URL: set{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">LARAVEL_API_BASE_URL</code> in{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">frontend/.env.local</code> (BFF reads it at
            runtime). Keep <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">NEXT_PUBLIC_API_BASE_URL</code>{" "}
            aligned for browser requests (e.g. <code className="font-mono">http://127.0.0.1:8000/api/v1</code>).
          </p>

          <div className="mt-3 border-t border-zinc-200/90 pt-2.5 text-center text-[10px] leading-snug text-zinc-500">
            <p>
              Anti-Scam PH is a product and service operated by{" "}
              <span className="font-semibold text-zinc-700">The Rising 2 Brothers OPC</span>.
            </p>
            <p className="mt-1 font-mono text-[10px] text-zinc-400">
              {process.env.NEXT_PUBLIC_APP_VERSION ?? "v1.0"}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "floating" && typeof document !== "undefined") {
    return createPortal(panel, document.body);
  }

  return panel;
}
