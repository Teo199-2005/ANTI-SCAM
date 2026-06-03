"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { VerifiedBadge } from "@/components/badges/VerifiedBadge";
import { cn } from "@/lib/utils";
import { Check, Shield, Star, Zap } from "lucide-react";
import Link from "next/link";

const NAVY = "#0d1f3c";
const GOLD = "#f5a623";

const BASIC_FEATURES = [
  "Verified resort listing on Anti-ScamPH",
  "Up to 10 active rooms",
  "Online booking & reservation management",
  "Guest dashboard & notifications",
  "Payment method integration",
  "Calendar & availability management",
  "Anti-ScamPH verification badge",
  "Scam protection for guests",
];

const PRO_FEATURES = [
  "Everything in Basic Verified, plus:",
  "Up to 20 active rooms",
  "Priority listing in search results",
  "Video embed on landing page",
  "Analytics & revenue reports",
  "Guest traffic & conversion insights",
  "Downloadable business reports",
  "Priority support channel",
  "Reward growth program access",
  "Business Pro verified gold badge",
];

export default function SubscriptionPlansPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0d1f3c] via-[#142952] to-[#1a3460] px-4 py-16 text-center sm:py-20 md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,166,35,0.12),transparent_60%)]" aria-hidden />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-amber-400" aria-hidden />
            <BrandWordmark tone="onDark" size="sm" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-white sm:text-4xl md:text-5xl">
            Subscription Plans
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            Choose the verification tier that matches your resort&apos;s needs. Every plan includes our core scam-protection features.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16 md:py-20">
        <div className="grid gap-8 md:grid-cols-2 md:gap-6 lg:gap-8">
          {/* Basic Verified */}
          <div className="relative flex flex-col rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                <VerifiedBadge size="sm" standardIconClassName="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold" style={{ color: NAVY }}>
                  Basic Verified
                </h2>
                <p className="text-sm text-zinc-500">Standard verification listing</p>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold" style={{ color: NAVY }}>Free</span>
              <span className="ml-1 text-zinc-500">/month</span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-zinc-600">
              Get listed on Anti-ScamPH with our core verification. Perfect for small resorts getting started
              with scam-protected online bookings.
            </p>
            <ul className="mb-8 flex-1 space-y-3">
              {BASIC_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-700">
                  <Check size={16} className="mt-0.5 shrink-0 text-sky-500" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Payment Setup</p>
              <p className="mt-1 text-sm text-zinc-600">
                No monthly subscription fee. Reservation fees are collected per booking.
              </p>
            </div>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center justify-center rounded-full border-2 border-[#0d1f3c] bg-white px-6 py-3 text-sm font-bold transition hover:bg-zinc-50"
              style={{ color: NAVY, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              Get Started
            </Link>
          </div>

          {/* Business Pro Verified */}
          <div className="relative flex flex-col rounded-2xl border-2 border-amber-400/60 bg-white p-6 shadow-xl sm:p-8">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg"
                style={{ background: `linear-gradient(165deg, #ffd47a 0%, ${GOLD} 45%, #c9840f 100%)` }}
              >
                <Star size={12} className="fill-white" aria-hidden />
                Recommended
              </span>
            </div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <VerifiedBadge premium size="sm" standardIconClassName="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold" style={{ color: NAVY }}>
                  Business Pro Verified
                </h2>
                <p className="text-sm text-amber-600 font-medium">Premium verification tier</p>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold" style={{ color: NAVY }}>₱1,000</span>
              <span className="ml-1 text-zinc-500">/month</span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-zinc-600">
              Unlock priority visibility, advanced analytics, and the gold Business Pro badge — the highest
              trust signal on Anti-ScamPH. Ideal for resorts serious about growth.
            </p>
            <ul className="mb-8 flex-1 space-y-3">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-700">
                  <Zap size={16} className={cn("mt-0.5 shrink-0", f === "Everything in Basic Verified, plus:" ? "text-amber-500" : "text-amber-400")} aria-hidden />
                  <span className={f === "Everything in Basic Verified, plus:" ? "font-semibold" : ""}>{f}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Payment Setup</p>
              <p className="mt-1 text-sm text-amber-800">
                Monthly subscription via GCash or credit/debit card. Cancel anytime.
              </p>
            </div>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-105"
              style={{ background: `linear-gradient(165deg, #ffd47a 0%, ${GOLD} 45%, #c9840f 100%)`, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              Upgrade to Business Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Anti-ScamPH Mission */}
      <section className="border-t border-zinc-100 bg-zinc-50 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Shield className="mx-auto h-10 w-10 text-sky-600" aria-hidden />
          <h2 className="mt-4 font-heading text-2xl font-bold sm:text-3xl" style={{ color: NAVY }}>
            Our Mission
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">
            Anti-ScamPH was built to protect Filipino travelers from resort booking scams. Every resort on our
            platform goes through a verification process — whether through site visitation or live video verification —
            so guests can book with confidence.
          </p>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">
            Our subscription plans fund the verification infrastructure, scam monitoring, and guest protection
            services that make the platform trustworthy. Higher-tier plans enable resorts to demonstrate their
            commitment to transparency and guest safety.
          </p>
        </div>
      </section>

      {/* Safety Disclaimer */}
      <section className="px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center sm:p-8">
          <h3 className="font-heading text-lg font-bold text-rose-900">Important Safety Notice</h3>
          <p className="mt-2 text-sm leading-relaxed text-rose-800">
            Even verified resorts require due diligence. Anti-ScamPH verification confirms the resort exists and
            has met our baseline requirements, but does not guarantee the quality of service. Always verify
            independently before sending payments outside the platform. If a deal seems too good to be true, it
            probably is.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-100 bg-gradient-to-b from-[#0d1f3c] to-[#142952] px-4 py-12 text-center sm:py-16">
        <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">
          Ready to list your resort?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-zinc-300">
          Join the platform that Filipino travelers trust. Get verified and start accepting bookings today.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-105"
            style={{ background: `linear-gradient(165deg, #ffd47a 0%, ${GOLD} 45%, #c9840f 100%)`, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            Register Your Resort
          </Link>
          <Link
            href="/resorts"
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/10"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            Browse Resorts
          </Link>
        </div>
      </section>
    </div>
  );
}
