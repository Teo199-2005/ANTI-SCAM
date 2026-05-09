"use client";

import { demoAccounts } from "@/lib/auth/demoAccounts";
import { useHydrated } from "@/hooks/useHydrated";
import { ChevronDown, ChevronUp, FlaskConical, Loader2 } from "lucide-react";
import { useState } from "react";

const showPanel =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_SHOW_DEMO_QUICK_LOGIN === "true";

type DemoQuickLoginProps = {
  /**
   * Called when the user taps a demo row.
   * The parent handles login + redirect so it has access to AuthContext.
   */
  onLoginAs: (email: string, password: string) => Promise<void>;
};

export default function DemoQuickLogin({ onLoginAs }: DemoQuickLoginProps) {
  const [open, setOpen] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const hydrated = useHydrated();

  if (!showPanel) return null;

  // Avoid hydrating <button> nodes that password-manager extensions mutate (e.g. fdprocessedid).
  if (!hydrated) return null;

  const handleClick = async (id: string, email: string, password: string) => {
    if (busyId) return;
    setErrorId(null);
    setBusyId(id);
    try {
      await onLoginAs(email, password);
      // parent redirects on success — no state cleanup needed
    } catch {
      setErrorId(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[min(100vw-2rem,18rem)] rounded-2xl border border-white/40 bg-white/80 shadow-float backdrop-blur-2xl backdrop-saturate-150">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-t-2xl border-b border-white/35 bg-navy/90 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white transition hover:bg-navy"
      >
        <span className="inline-flex items-center gap-2">
          <FlaskConical size={14} />
          Demo accounts
        </span>
        {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>

      {open && (
        <div className="p-3">
          <p className="mb-2.5 text-xs leading-relaxed text-zinc-500">
            <strong className="text-zinc-700">One tap</strong> = instant login &amp; redirect.
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
                  onClick={() => void handleClick(acc.id, acc.email, acc.password)}
                  className={`
                    group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left
                    shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60
                    ${hasError
                      ? "border-red-300 bg-red-50/80 text-red-900"
                      : isBusy
                        ? "border-navy/40 bg-navy/10 text-zinc-900"
                        : "border-white/50 bg-white/55 text-zinc-800 hover:border-navy/30 hover:bg-white/90"}
                  `}
                >
                  {/* Spinner / idle dot */}
                  <span className={`
                    flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold
                    ${hasError ? "border-red-300 bg-red-100 text-red-700" : "border-white/50 bg-white/60 text-navy"}
                  `}>
                    {isBusy
                      ? <Loader2 size={13} className="animate-spin text-navy" />
                      : hasError
                        ? "!"
                        : acc.id === "admin" ? "A"
                          : acc.id === "owner" ? "O"
                            : acc.id === "marketing" ? "M"
                              : acc.id === "client" ? "G"
                                : "U"}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold leading-tight text-zinc-900">
                      {acc.label}
                    </span>
                    <span className="block truncate font-mono text-xs font-normal text-zinc-500">
                      {acc.email}
                    </span>
                    {hasError && (
                      <span className="block text-xs text-red-700">Login failed — check backend</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-2.5 text-xs text-zinc-400">
            Passwords: <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">password</code>
            {" · "}If Marketing fails to login:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-700">
              php artisan db:seed --class=MarketingPartnerDemoSeeder
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
