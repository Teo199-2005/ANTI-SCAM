"use client";

/**
 * Marketing home (`/`) — premium landing surface.
 * - Desktop / large layout: `lg:` grid + headline nowrap + side-by-side CTAs (unchanged intent).
 * - Small screens (`max-lg:`): mobile-first composition — wrapped headlines, stacked CTAs,
 *   horizontal pricing strip, single-column trust rhythm, safe-area gutters.
 */

import Link from "next/link";
import {
  BarChart2,
  Building,
  Calendar,
  Globe,
  Lock,
  MapPin,
  MessageSquare,
  Phone,
  Compass,
  Shield,
  Users,
} from "lucide-react";
import { BusinessProVerifiedBadge } from "@/components/badges/BusinessProVerifiedBadge";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { SubscriptionPlansComparison } from "@/components/marketing/SubscriptionPlansComparison";
import { MarketingPremiumNavbar } from "@/components/layout/MarketingPremiumNavbar";
import { useRegisterModal } from "@/contexts/RegisterModalContext";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { cn } from "@/lib/utils";

const NAVY = "#0d1f3c";
const GOLD = "#f5a623";
/** Darker gold for hero accent line (“Increase Direct Bookings.”) — reads stronger on light hero wash */
const GOLD_DARK = "#b8730d";
/** Wordmark: trust navy + alert red (not gold) */
const WORDMARK_NAVY = "#0B1F3A";
const SCAM_ALERT_RED = "#E53935";

/** Headline lines — `lg:`+ match desktop column (nowrap + vw clamps). Below `lg`, wrap for readable mobile line length. */
const HERO_HEADLINE_ROW =
  "block max-lg:whitespace-normal max-lg:text-pretty max-lg:text-[clamp(1.28rem,6.2vw+0.35rem,2rem)] max-lg:leading-[1.08] lg:whitespace-nowrap lg:text-[clamp(1.02rem,1.82vw+0.52rem,1.92rem)] xl:text-[clamp(1.06rem,1.92vw+0.48rem,2.1rem)] 2xl:text-[clamp(1.12rem,2.02vw+0.45rem,2.55rem)]";

const REGISTER_GOLD_BACKGROUND = `linear-gradient(165deg, #ffd47a 0%, ${GOLD} 40%, #c9840f 100%)`;
const REGISTER_GOLD_SHINE_CORE =
  "relative isolate inline-flex items-center overflow-hidden text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_5px_14px_rgba(180,110,0,0.22)] transition [text-shadow:0_1px_0_rgba(0,0,0,0.12)] hover:brightness-[1.05] active:brightness-[0.98]";
/** Pricing “Get Started” + small gold pills — lighter rim */
const REGISTER_GOLD_SHINE_BASE = `${REGISTER_GOLD_SHINE_CORE} border border-amber-200/50`;
/** Nav + hero “Register Your Resort” — darker rim */
const REGISTER_GOLD_SHINE_REGISTER_BTN = `${REGISTER_GOLD_SHINE_CORE} border-2 border-amber-950/45`;
const REGISTER_GOLD_GLOSS_LAYER =
  "pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_0%,transparent_42%,rgba(255,255,255,0.22)_50%,transparent_58%,transparent_100%)] opacity-90";

const registerGoldButtonStyle = {
  background: REGISTER_GOLD_BACKGROUND,
  fontFamily: "var(--font-inter), system-ui, sans-serif",
} as const;

export function LandingPremiumPage() {
  const { openRegisterModal } = useRegisterModal();

  return (
    <div className="min-w-0 origin-top overflow-x-hidden bg-white font-body text-[#111] antialiased max-lg:[zoom:1] lg:[zoom:1.05]">
      {/* ── Hero + glass nav over image (nav does not stack above hero) ── */}
      <section className="relative isolate min-h-[min(52svh,34rem)] overflow-hidden max-lg:min-h-[min(58svh,36rem)] lg:min-h-[min(50svh,30rem)] lg:pb-2">
        <div className="absolute inset-0">
          <ImageWithFallback
            src="/bgresort.png"
            alt="Luxury resort at dusk"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.55) 14%, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0.06) 46%, rgba(255,255,255,0) 58%)",
            }}
            aria-hidden
          />
          {/* Mobile-only legibility wash — desktop gradient above stays as authored from `lg`. */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/45 to-white/10 lg:hidden"
            aria-hidden
          />
        </div>

        <MarketingPremiumNavbar mode="hero" />

        <div className="relative z-10 mx-auto grid w-full max-w-[min(1360px,100%)] grid-cols-1 items-start gap-5 pb-8 pt-[max(4.75rem,calc(env(safe-area-inset-top)+3.25rem))] ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] max-lg:gap-6 max-lg:pb-10 sm:gap-4 sm:ps-0.5 sm:pe-6 md:ps-1 md:pe-7 lg:grid-cols-12 lg:items-center lg:gap-x-4 lg:gap-y-2 lg:pb-5 lg:ps-1 lg:pe-10 lg:pt-[max(5.25rem,calc(env(safe-area-inset-top)+4.15rem))] xl:pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.35rem))] 2xl:pt-[max(5.75rem,calc(env(safe-area-inset-top)+4.5rem))] xl:ps-2">
          {/* Left — copy + CTAs. `lg:` column + nudge matches desktop layout. */}
          <div className="z-10 min-w-0 max-lg:order-1 lg:col-span-4 lg:-translate-x-3 xl:-translate-x-6 2xl:-translate-x-8">
            <div className="mb-3 flex max-w-lg flex-col gap-1.5 sm:mb-2 sm:flex-row sm:items-center sm:gap-2">
              <Users
                className="hidden h-5 w-5 shrink-0 text-gray-500 sm:block sm:h-[1.35rem] sm:w-[1.35rem]"
                aria-hidden
              />
              <span
                className="text-[12px] font-bold uppercase leading-snug tracking-[0.12em] text-[#555] sm:text-[13px] md:text-[14px]"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                The Philippines&rsquo; verified resort platform
              </span>
            </div>

            <h1 className="font-pop m-0 max-w-full font-extrabold leading-[1.06] tracking-tight max-lg:max-w-[22rem] lg:max-w-full">
              <span className={HERO_HEADLINE_ROW} style={{ color: WORDMARK_NAVY }}>
                Protect Your Resort.
              </span>
              <span className={HERO_HEADLINE_ROW} style={{ color: WORDMARK_NAVY }}>
                Build Guest Trust.
              </span>
              <span className={HERO_HEADLINE_ROW} style={{ color: GOLD_DARK }}>
                Increase Direct Bookings.
              </span>
            </h1>

            <p
              className="mt-3 max-w-xl text-pretty text-[15px] font-medium leading-relaxed text-[#444] max-lg:max-w-[22rem] sm:max-w-2xl sm:text-[16px]"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              Anti-Scam PH helps Philippine resorts prevent fake bookings, avoid double reservations, and gain guest trust
              through verified booking technology.
            </p>

            <div className="mt-5 flex max-w-lg flex-col gap-3 lg:mt-4 lg:max-w-none lg:flex-row lg:flex-nowrap lg:items-center lg:gap-2.5">
              <button
                type="button"
                className={cn(
                  REGISTER_GOLD_SHINE_REGISTER_BTN,
                  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-extrabold lg:min-h-0 lg:w-auto lg:flex-none lg:rounded-lg lg:px-6 lg:py-3 lg:text-base"
                )}
                style={registerGoldButtonStyle}
                onClick={() => openRegisterModal()}
              >
                <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
                <Building className="relative z-10 h-[1.125rem] w-[1.125rem] shrink-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.15)] sm:h-5 sm:w-5" aria-hidden />
                <span className="relative z-10">Register Your Resort →</span>
              </button>
              <Link
                href="/resorts"
                className="relative isolate inline-flex min-h-[48px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-slate-500/85 bg-gradient-to-b from-white to-slate-100 px-4 py-3 text-[14px] font-extrabold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(15,23,42,0.07),0_4px_12px_rgba(15,23,42,0.06)] transition hover:brightness-[1.03] active:brightness-[0.99] lg:min-h-0 lg:w-auto lg:shrink-0 lg:rounded-lg lg:gap-2 lg:px-6 lg:py-3 lg:text-base"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                <span
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_0%,transparent_40%,rgba(255,255,255,0.55)_50%,transparent_60%,transparent_100%)] opacity-70"
                  aria-hidden
                />
                <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-800 bg-gradient-to-br from-white to-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:h-7 sm:w-7">
                  <Compass className="h-3.5 w-3.5 text-slate-800 sm:h-4 sm:w-4" aria-hidden />
                </span>
                <span className="relative z-10">Browse Resorts</span>
              </Link>
            </div>

            <div className="mt-4 grid max-w-lg grid-cols-1 gap-x-3 gap-y-3 text-[#555] max-lg:gap-y-3.5 lg:max-w-none lg:grid-cols-2 lg:gap-x-4 lg:gap-y-3">
              {[
                { icon: Shield, label: "SEC Registered Company" },
                { icon: MapPin, label: "Philippine-Based Support" },
                { icon: null, label: "Verified Resort Badge System", verifiedBadge: true as const },
                { icon: Lock, label: "Secure Reservation Processing" },
              ].map(({ icon: Icon, label, verifiedBadge }) => (
                <div key={label} className="flex min-w-0 items-start gap-2">
                  {verifiedBadge ? (
                    <BusinessProVerifiedBadge size="lg" className="mt-0.5" />
                  ) : Icon ? (
                    <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" aria-hidden />
                  ) : null}
                  <span className="min-w-0 text-[12px] font-semibold leading-snug sm:text-[13px]" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Center badge — compact for above-the-fold pricing */}
          <div className="z-10 flex justify-center max-lg:order-2 max-lg:pt-1 lg:col-span-4">
            <ImageWithFallback
              src="/founding500.png"
              alt="Founding 500 — verified resort partners"
              width={560}
              height={620}
              className="h-auto w-[min(17.5rem,calc(100vw-2.5rem))] max-w-full object-contain object-center drop-shadow-2xl sm:w-[18rem] md:w-[19.5rem] lg:w-[20rem] xl:w-[22rem] 2xl:w-[24rem]"
              sizes="(max-width: 640px) 248px, (max-width: 768px) 288px, (max-width: 1024px) 312px, (max-width: 1280px) 320px, (max-width: 1536px) 352px, 384px"
              priority
            />
          </div>

          {/* Right feature card — `lg:` column matches desktop. */}
          <div id="product-demo" className="z-10 scroll-mt-28 max-lg:order-3 lg:col-span-4">
            <div
              className="space-y-3.5 rounded-xl border-2 border-white/30 p-4 shadow-xl ring-2 ring-black/10 max-lg:backdrop-blur-xl sm:space-y-3.5 sm:rounded-2xl sm:p-5"
              style={{ backgroundColor: NAVY }}
            >
              {[
                {
                  icon: Shield,
                  title: "Actual Verification",
                  desc: "Site inspection or live verification.",
                },
                {
                  icon: Calendar,
                  title: "Smart Reservation System",
                  desc: "No double bookings. Real-time updates.",
                },
                {
                  icon: Globe,
                  title: "Dedicated Booking Website",
                  desc: "Your own branded booking page.",
                },
                {
                  icon: BarChart2,
                  title: "Monthly Reports",
                  desc: "Track reservations, occupancy and revenue.",
                },
                {
                  icon: MessageSquare,
                  title: "Less Inquiries, More Bookings",
                  desc: "Automated guest management and confirmations.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-2.5 sm:gap-3">
                  <Icon
                    className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 sm:h-[1.35rem] sm:w-[1.35rem]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div>
                    <p className="font-pop text-[14px] font-bold leading-tight text-white sm:text-[15px]">
                      {title}
                    </p>
                    <p
                      className="mt-0.5 text-[12px] font-medium leading-snug text-[#b0bcd4] sm:text-[14px]"
                      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                    >
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing — Standard vs Business Pro ── */}
      <section
        className="border-t border-zinc-200/70 py-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:py-5 sm:pl-4 sm:pr-6 md:pl-5 md:pr-7 lg:pl-6 lg:pr-10"
        style={{
          backgroundColor: "#ffffff",
          backgroundImage: 'url("/patterns/cloth-alike.png")',
        }}
      >
        <div className="mx-auto mb-3 h-px w-full max-w-[min(1100px,100%)] bg-gradient-to-r from-transparent via-zinc-300/80 to-transparent" aria-hidden />
        <ScrollReveal direction="up" delayMs={30}>
          <SubscriptionPlansComparison compact />
        </ScrollReveal>
      </section>

      {/* ── Trust strip — even band. `md:grid-cols-5` restores desktop tablet grid. ── */}
      <section
        className="border-t border-zinc-200/70 bg-zinc-100/95 py-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-4 sm:pr-6 md:pl-5 md:pr-7 lg:py-5 lg:pl-6 lg:pr-10"
        aria-label="Trust and values"
      >
        <div className="mx-auto mb-6 h-px w-full max-w-[min(1100px,100%)] bg-gradient-to-r from-transparent via-zinc-300/85 to-transparent sm:mb-6" aria-hidden />
        <ScrollReveal className="mx-auto w-full max-w-[min(1100px,100%)]" direction="down" delayMs={40}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5 md:gap-5">
            {[
              {
                icon: <Shield className="mx-auto h-7 w-7 text-zinc-600 [stroke-width:1.65] max-md:mx-0 md:mx-auto" aria-hidden />,
                text: "Stronger Resorts. Safer Guests. Better Business.",
              },
              {
                icon: <Users className="mx-auto h-7 w-7 text-zinc-600 [stroke-width:1.65] max-md:mx-0 md:mx-auto" aria-hidden />,
                text: "Together, let's build a trusted resort industry in the Philippines.",
              },
              {
                icon: (
                  <ImageWithFallback
                    src="/phcircle.png"
                    alt="Philippines"
                    width={56}
                    height={56}
                    className="mx-auto h-7 w-7 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-zinc-300/80 max-md:mx-0 md:mx-auto"
                  />
                ),
                text: "Proudly Filipino. Built for Philippine Resorts.",
              },
              {
                icon: <Phone className="mx-auto h-7 w-7 text-zinc-600 [stroke-width:1.65] max-md:mx-0 md:mx-auto" aria-hidden />,
                text: "Real People. Real Support. We're here to help.",
              },
              {
                icon: <Lock className="mx-auto h-7 w-7 text-zinc-600 [stroke-width:1.65] max-md:mx-0 md:mx-auto" aria-hidden />,
                text: "Your Partner in Growth and Guest Trust.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col items-center gap-2 text-center",
                  "max-md:flex-row max-md:items-start max-md:gap-3 max-md:rounded-2xl max-md:border max-md:border-zinc-200/85 max-md:bg-white/75 max-md:p-4 max-md:text-left max-md:shadow-sm",
                  i === 0 && "md:items-start md:text-left",
                  i > 0 &&
                    "border-zinc-800/80 md:flex md:flex-col md:items-start md:border-l md:pl-8 md:text-left lg:pl-10",
                )}
              >
                {item.icon}
                <p
                  className="max-md:min-w-0 max-md:flex-1 max-md:text-pretty text-xs font-semibold leading-snug text-zinc-700"
                  style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer bar ── */}
      <footer
        className="border-t-2 border-white/25 py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] text-center sm:pl-4 sm:pr-6 md:pl-5 md:pr-7 lg:py-3 lg:pl-6 lg:pr-10"
        style={{ backgroundColor: NAVY }}
      >
        <span
          className="mx-auto inline-flex max-w-[min(22rem,100%)] flex-wrap items-center justify-center gap-2 text-pretty text-[13px] font-bold leading-snug text-white sm:max-w-none"
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
        >
          <Lock className="h-4 w-4 shrink-0 text-zinc-300 [stroke-width:1.75]" aria-hidden />
          Founding rates are locked as long as your subscription remains active.
        </span>
      </footer>
    </div>
  );
}
