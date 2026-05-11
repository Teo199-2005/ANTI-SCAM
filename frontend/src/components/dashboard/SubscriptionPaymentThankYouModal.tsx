"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import DashModal from "@/components/dash/DashModal";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export type SubscriptionPaymentThankVariant = "synced" | "pending" | "generic" | "error";

type Props = {
  open: boolean;
  onClose: () => void;
  variant: SubscriptionPaymentThankVariant;
};

const copy: Record<SubscriptionPaymentThankVariant, { title: string; desc: string }> = {
  synced: {
    title: "You're all set",
    desc: "Your payment was confirmed and your subscription is active. You can keep building your resort listing without interruption.",
  },
  pending: {
    title: "Payment received",
    desc: "The payment gateway is still finalizing this charge. Give it a few seconds, then refresh if your status has not updated.",
  },
  generic: {
    title: "Thank you",
    desc: 'We\'re processing your payment. If the top bar still shows "pending payment" after a short wait, refresh the page.',
  },
  error: {
    title: "We could not confirm instantly",
    desc: "If Xendit showed success, your subscription will still update shortly when our server hears from the payment provider. Refresh in a moment or contact support if it stays pending.",
  },
};

export default function SubscriptionPaymentThankYouModal({ open, onClose, variant }: Props) {
  const { title, desc } = copy[variant];
  const positive = variant !== "error";

  return (
    <DashModal
      open={open}
      onClose={onClose}
      title={
        <span className="flex flex-col gap-1.5">
          <span className="rounded-lg border border-softBorder bg-gradient-to-r from-navy/5 via-primaryBlue/8 to-slateBlue/10 px-2.5 py-2">
            <BrandWordmark size="xs" subtitle tone="onLight" />
          </span>
          <span>{title}</span>
        </span>
      }
      description="Anti-Scam PH · Resort subscription"
      className="max-w-md"
      initialFocusSelector='[data-thankyou-primary="true"]'
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
            positive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          {positive ? (
            <CheckCircle2 className="h-8 w-8" strokeWidth={2} aria-hidden />
          ) : (
            <AlertTriangle className="h-8 w-8" strokeWidth={2} aria-hidden />
          )}
        </div>
        <p className="text-sm leading-relaxed text-zinc-600">{desc}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Secured checkout · Xendit</p>
        <button
          type="button"
          data-thankyou-primary="true"
          onClick={onClose}
          className="dash-btn-primary w-full max-w-xs px-5 py-2.5"
        >
          Continue to dashboard
        </button>
      </div>
    </DashModal>
  );
}
