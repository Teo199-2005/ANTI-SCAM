"use client";

import DashCard from "@/components/dash/DashCard";
import { useToast } from "@/components/shared/ToastProvider";
import { getMarketingStats } from "@/lib/api/marketing";
import { Building2, ClipboardCopy, Link2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function MarketingReferralsPage() {
  const { pushToast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [registerUrl, setRegisterUrl] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getMarketingStats()
      .then((s) => {
        if (cancelled) return;
        setReferralCode(s.referral_code);
        // Always tie the copied link to the site the marketer is actually using (avoids stale FRONTEND_URL / localhost).
        if (s.referral_code) {
          setRegisterUrl(`${window.location.origin.replace(/\/$/, "")}/register?ref=${encodeURIComponent(s.referral_code)}`);
        } else {
          setRegisterUrl(null);
        }
        setHint(s.referral_subscribe_hint);
      })
      .catch(() => {
        if (!cancelled) pushToast({ title: "Could not load referral data", tone: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pushToast]);

  const copyText = useCallback(
    async (label: string, value: string | null) => {
      if (!value) {
        pushToast({ title: "Nothing to copy", tone: "warning" });
        return;
      }
      try {
        await navigator.clipboard.writeText(value);
        pushToast({ title: `${label} copied`, tone: "success" });
      } catch {
        pushToast({ title: "Copy failed", description: "Your browser blocked clipboard access.", tone: "error" });
      }
    },
    [pushToast],
  );

  return (
    <div className="space-y-6">
      <div className="dash-hero-banner-cta">
        <p className="font-dash text-dash-xs font-medium text-white/70">Referral toolkit</p>
        <h1 className="mt-1 font-dash text-dash-2xl font-bold text-white md:text-dash-3xl">Codes, links & commissioning</h1>
        <p className="mt-2 max-w-2xl font-dash text-dash-sm text-white/85">
          Your personal code is derived from your surname plus four digits. Owners apply it at checkout for assigned resorts only so
          commissions stay accurate.
        </p>
      </div>

      <DashCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-dash text-base font-semibold text-navy">Your referral code</h2>
            <p className="mt-1 text-xs text-zinc-500">Share with resort owners you support (assigned resorts).</p>
          </div>
          <button
            type="button"
            disabled={loading || !referralCode}
            onClick={() => void copyText("Referral code", referralCode)}
            className="dash-btn-primary gap-2 text-dash-xs disabled:opacity-50"
          >
            <ClipboardCopy size={14} /> Copy code
          </button>
        </div>
        <p className="mt-4 rounded-xl border border-softBorder bg-softGray/40 px-4 py-3 font-mono text-lg font-bold tracking-wide text-navy">
          {loading ? "…" : referralCode ?? "—"}
        </p>
      </DashCard>

      <DashCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-dash text-base font-semibold text-navy">Guest registration link</h2>
            <p className="mt-1 text-xs text-zinc-500">Prefills discovery traffic with your marketer context.</p>
          </div>
          <button
            type="button"
            disabled={loading || !registerUrl}
            onClick={() => void copyText("Registration link", registerUrl)}
            className="dash-btn-sm gap-2 border-navy/15 bg-white text-dash-xs text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            <Link2 size={14} /> Copy link
          </button>
        </div>
        <p className="mt-3 break-all text-xs text-zinc-600">{loading ? "…" : registerUrl ?? "—"}</p>
      </DashCard>

      <DashCard className="p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-sky-100 p-2">
            <Building2 size={18} className="text-sky-700" />
          </div>
          <div>
            <h2 className="font-dash text-base font-semibold text-navy">Subscription referrals</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {hint ??
                "Assigned resort owners enter your code in the Subscribe modal before Xendit checkout. Successful monthly subscription payments credit your pending commissions for that resort."}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              Admin links marketers to resorts. Codes only validate when the owner&apos;s property matches an assignment.
            </p>
          </div>
        </div>
      </DashCard>
    </div>
  );
}
