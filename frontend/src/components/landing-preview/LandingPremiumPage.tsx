"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Award,
  BarChart3,
  Calendar,
  Globe,
  Handshake,
  Headphones,
  Lock,
  Play,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { MARKETING_OVERLAY_HERO_BLEED_NEG_CLASS } from "@/lib/authMarketingNavOverlay";
import { cn } from "@/lib/utils";

const trustItems = [
  { label: "SEC Registered Company", Icon: Shield },
  { label: "Philippine-Based Support", Icon: Headphones },
  { label: "Verified Resort Badge System", Icon: ShieldCheck },
  { label: "Secure Reservation Processing", Icon: Lock },
] as const;

const glassFeatures = [
  {
    icon: ShieldCheck,
    title: "Actual Verification",
    description: "Site inspection or live video verification for legitimacy and guest confidence.",
  },
  {
    icon: Calendar,
    title: "Smart Reservation System",
    description: "Real-time booking management with calendar sync and double-booking prevention.",
  },
  {
    icon: Globe,
    title: "Dedicated Booking Website",
    description: "Each resort gets a branded reservation page with automated inquiry handling.",
  },
  {
    icon: BarChart3,
    title: "Monthly Reports",
    description: "Reservations, revenue, occupancy, and performance in one organized view.",
  },
  {
    icon: TrendingUp,
    title: "Less Inquiries, More Bookings",
    description: "Streamlined flows so guests book faster with fewer back-and-forth messages.",
  },
] as const;

type ValuePropRow =
  | { kind: "icon"; title: string; subtitle: string; Icon: LucideIcon }
  | { kind: "flag"; title: string; subtitle: string };

const valueProps: readonly ValuePropRow[] = [
  { kind: "icon", title: "Stronger Resorts", subtitle: "Safer guests. Better business.", Icon: Shield },
  { kind: "icon", title: "Industry trust", subtitle: "Building a trusted resort industry.", Icon: Award },
  { kind: "flag", title: "Proudly Filipino", subtitle: "Built for Philippine resorts." },
  { kind: "icon", title: "Real people", subtitle: "Real support.", Icon: Headphones },
  { kind: "icon", title: "Your partner", subtitle: "Growth and guest trust.", Icon: Handshake },
];

const pricingPlans: readonly {
  name: string;
  price: string;
  listPrice: string;
  period: string;
  blurb: string;
  featured: boolean;
  tag?: string;
  saveYearly?: string;
}[] = [
  {
    name: "Monthly Plan",
    price: "₱2,100",
    listPrice: "₱2,500",
    period: "/mo",
    blurb: "Flexible month-to-month access.",
    featured: false,
  },
  {
    name: "3-Month Plan",
    price: "₱1,900",
    listPrice: "₱2,200",
    period: "/mo",
    blurb: "Save when you commit quarterly.",
    featured: false,
  },
  {
    name: "6-Month Plan",
    price: "₱1,750",
    listPrice: "₱2,000",
    period: "/mo",
    blurb: "Best balance of savings and agility.",
    featured: false,
  },
  {
    name: "12-Month Plan",
    price: "₱1,500",
    listPrice: "₱2,300",
    period: "/mo",
    blurb: "Maximum savings for established resorts.",
    featured: true,
    tag: "BEST VALUE",
    saveYearly: "Save ₱9,600 yearly",
  },
];

export function LandingPremiumPage() {
  return (
    <div className="relative min-w-0 bg-[#F8FAFC] pb-[calc(3.25rem+env(safe-area-inset-bottom))] font-body text-[#071B46] antialiased">
      {/* ── Hero ── */}
      <section
        className={cn(
          "relative isolate min-h-[min(92svh,56rem)] overflow-hidden lg:min-h-[min(88vh,52rem)]",
          MARKETING_OVERLAY_HERO_BLEED_NEG_CLASS
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/bgresort.png"
            alt=""
            fill
            priority
            className="object-cover object-center brightness-[0.9] saturate-[1.14]"
            sizes="100vw"
          />
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#F8FAFC] from-0% via-[#F8FAFC]/94 via-[32%] via-[#eef2f9]/50 via-[50%] to-transparent to-[76%]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-white/45 via-transparent to-[#0B2C6B]/22 mix-blend-soft-light"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-[20%] top-[18%] z-[1] h-[min(85vw,30rem)] w-[min(85vw,30rem)] rounded-full bg-[#FFC928]/14 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 z-[1] h-[55%] w-[55%] bg-gradient-to-tl from-[#071B46]/18 to-transparent blur-2xl"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex max-w-[90rem] flex-col px-4 pb-16 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.75rem))] sm:px-6 sm:pb-20 sm:pt-[max(5.75rem,calc(env(safe-area-inset-top)+4.9rem))] lg:grid lg:min-h-[min(80vh,48rem)] lg:grid-cols-12 lg:items-center lg:gap-x-5 lg:gap-y-8 lg:px-10 lg:pb-24 lg:pt-10 xl:gap-x-8 xl:px-12">
          {/* Left */}
          <div className="relative z-20 lg:col-span-5">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#071B46]/12 bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase leading-snug tracking-[0.16em] text-[#0B2C6B] shadow-sm backdrop-blur-md sm:text-[11px] sm:tracking-[0.18em]">
              <Users className="h-3.5 w-3.5 shrink-0 text-[#F5B400]" aria-hidden />
              <span className="text-balance">The Philippines&rsquo; verified resort platform</span>
            </p>

            <h1 className="mt-6 max-w-xl text-balance text-3xl font-bold leading-[1.08] tracking-tight text-[#071B46] sm:text-4xl md:text-5xl lg:text-[2.65rem] lg:leading-[1.06] xl:text-[2.75rem] 2xl:text-6xl">
              Protect Your Resort.
              <br />
              Build Guest Trust.
              <br />
              <span className="bg-gradient-to-r from-[#F5B400] via-[#FFC928] to-[#F5B400] bg-clip-text text-transparent">
                Increase Direct Bookings.
              </span>
            </h1>

            <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-[#0B2C6B]/88 sm:text-base">
              Stop fake bookings and win back guest confidence with verified listings, secure reservations, and a
              resort-first platform built for the Philippines.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F5B400] to-[#FFC928] px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-[#071B46] shadow-[0_14px_44px_-10px_rgba(245,180,0,0.55)] transition hover:brightness-105"
              >
                Register Your Resort
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
              </Link>
              <Link
                href="#product-demo"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/90 bg-white/30 px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-[#071B46] shadow-sm backdrop-blur-md transition hover:bg-white/50"
              >
                <Play className="h-4 w-4 shrink-0 text-[#071B46]" strokeWidth={2.25} aria-hidden />
                See Demo
              </Link>
            </div>

            <ul className="mt-10 grid max-w-xl gap-3 sm:grid-cols-2">
              {trustItems.map(({ label, Icon }) => (
                <li
                  key={label}
                  className="flex items-start gap-2.5 text-xs font-medium leading-snug text-[#0B2C6B]/92 sm:text-sm"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#071B46]/10 bg-white/60 text-[#0B2C6B] shadow-sm backdrop-blur-sm">
                    <Icon className="h-3.5 w-3.5 text-[#F5B400]" strokeWidth={2} aria-hidden />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Center badge */}
          <div className="relative z-30 flex justify-center py-8 lg:col-span-2 lg:min-h-[20rem] lg:items-center lg:py-0">
            <motion.div
              className="relative w-[min(74vw,17rem)] sm:w-[min(58vw,19rem)] lg:w-[min(24vw,16rem)] xl:w-[17.5rem]"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <div
                className="pointer-events-none absolute inset-[-18%] rounded-full bg-[#FFC928]/22 blur-3xl"
                aria-hidden
              />
              <motion.div
                className="pointer-events-none absolute inset-[-8%] rounded-full bg-[#F5B400]/18 blur-xl"
                animate={{ opacity: [0.45, 0.88, 0.45] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              />
              <Image
                src="/founding500.png"
                alt="Founding 500 — verified resort partners"
                width={480}
                height={520}
                className="relative z-[1] w-full drop-shadow-[0_32px_60px_rgba(7,27,70,0.5)]"
                priority
              />
            </motion.div>
          </div>

          {/* Right glass */}
          <div id="product-demo" className="relative z-20 scroll-mt-28 lg:col-span-5">
            <div
              className={cn(
                "rounded-[28px] border border-white/28 bg-[#071B46]/58 p-6 shadow-[0_28px_90px_-28px_rgba(7,27,70,0.72),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150",
                "ring-1 ring-[#F5B400]/18"
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFC928]/95">Platform</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">
                Everything you need in one verified stack
              </h2>
              <ul className="mt-5 divide-y divide-white/12">
                {glassFeatures.map(({ icon: Icon, title, description }) => (
                  <li key={title} className="flex gap-4 py-4 first:pt-0">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#F5B400]/38 bg-[#0B2C6B]/55 text-[#FFC928] shadow-inner">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-white/72">{description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        id="pricing"
        className="border-t border-[#071B46]/6 bg-[#F8FAFC] px-4 py-14 sm:px-6 lg:px-10 xl:px-12"
        aria-labelledby="pricing-heading"
      >
        <div className="mx-auto max-w-6xl">
          <div
            className="mb-8 flex items-center justify-center gap-2 rounded-xl border border-[#071B46] bg-[#071B46] px-4 py-3 text-center shadow-lg sm:gap-3 sm:px-6"
            role="note"
          >
            <Lock className="h-4 w-4 shrink-0 text-[#FFC928]" strokeWidth={2.25} aria-hidden />
            <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.14em] text-white sm:text-xs sm:tracking-[0.16em]">
              Founding partner rates locked for early resorts
            </p>
          </div>

          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0B2C6B]/55">Simple pricing</p>
            <h2 id="pricing-heading" className="mt-2 text-2xl font-bold tracking-tight text-[#071B46] sm:text-3xl">
              Plans that scale with your resort
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-[#0B2C6B]/75 sm:text-base">
              Transparent tiers for verified Philippine resorts. Lock in founding rates while slots remain.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 shadow-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_56px_-28px_rgba(7,27,70,0.22)]",
                  plan.featured
                    ? "border-[#F5B400]/45 bg-[#071B46] text-white ring-2 ring-[#FFC928]/35"
                    : "border-[#071B46]/8 bg-white text-[#071B46]"
                )}
              >
                {plan.tag ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#F5B400] to-[#FFC928] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#071B46] shadow-md">
                    {plan.tag}
                  </span>
                ) : null}
                <h3
                  className={cn(
                    "text-sm font-bold uppercase tracking-wide",
                    plan.featured ? "text-[#FFC928]" : "text-[#0B2C6B]/80"
                  )}
                >
                  {plan.name}
                </h3>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {!plan.featured ? (
                    <span className="text-lg font-semibold text-red-600/90 line-through decoration-red-600/70">
                      {plan.listPrice}
                    </span>
                  ) : (
                    <span className="text-lg font-semibold text-red-300/90 line-through decoration-red-200/60">
                      {plan.listPrice}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-3xl font-bold tracking-tight",
                      plan.featured ? "text-white" : "text-[#071B46]"
                    )}
                  >
                    {plan.price}
                  </span>
                  <span className={cn("text-sm", plan.featured ? "text-white/70" : "text-[#0B2C6B]/60")}>
                    {plan.period}
                  </span>
                </div>
                {plan.saveYearly ? (
                  <p className="mt-2 text-sm font-semibold text-[#FFC928]">{plan.saveYearly}</p>
                ) : null}
                <p className={cn("mt-3 flex-1 text-sm leading-relaxed", plan.featured ? "text-white/76" : "text-[#0B2C6B]/72")}>
                  {plan.blurb}
                </p>
                <Link
                  href="/register"
                  className={cn(
                    "mt-6 inline-flex w-full items-center justify-center rounded-xl py-3 text-center text-sm font-bold uppercase tracking-wide transition",
                    plan.featured
                      ? "bg-gradient-to-r from-[#F5B400] to-[#FFC928] text-[#071B46] hover:brightness-110"
                      : "border border-[#071B46]/14 bg-[#F8FAFC] text-[#071B46] hover:border-[#071B46]/28"
                  )}
                >
                  Get started
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value proposition row ── */}
      <section className="border-t border-[#071B46]/6 bg-white px-4 py-14 sm:px-6 lg:px-10 xl:px-12" aria-label="Why Anti-Scam PH">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {valueProps.map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center text-center lg:items-center lg:px-1"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#071B46]/10 bg-[#F8FAFC] text-[#071B46] shadow-sm">
                {item.kind === "flag" ? (
                  <span className="text-2xl leading-none" role="img" aria-label="Philippines">
                    🇵🇭
                  </span>
                ) : (
                  <item.Icon className="h-6 w-6 text-[#0B2C6B]" strokeWidth={1.75} aria-hidden />
                )}
              </span>
              <p className="mt-4 text-sm font-bold uppercase tracking-wide text-[#071B46]">{item.title}</p>
              <p className="mt-1.5 max-w-[14rem] text-sm leading-snug text-[#0B2C6B]/75">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky founding rates bar */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[35] flex justify-center px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
        role="presentation"
      >
        <div
          className="pointer-events-auto flex max-w-3xl items-center gap-2.5 rounded-full border border-white/10 bg-[#071B46]/95 px-4 py-2.5 text-center shadow-[0_-8px_40px_rgba(7,27,70,0.35)] backdrop-blur-md sm:gap-3 sm:px-5"
          role="status"
        >
          <Lock className="h-3.5 w-3.5 shrink-0 text-[#FFC928] sm:h-4 sm:w-4" aria-hidden />
          <p className="text-[10px] font-semibold leading-snug text-white/95 sm:text-[11px] sm:leading-normal">
            Founding rates are locked as long as your subscription remains active.
          </p>
        </div>
      </div>
    </div>
  );
}
