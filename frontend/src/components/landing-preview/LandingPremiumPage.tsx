"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart2,
  Building,
  Calendar,
  CheckCircle,
  Globe,
  Lock,
  MapPin,
  Menu,
  MessageSquare,
  Phone,
  Play,
  Shield,
  Users,
  X,
} from "lucide-react";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { cn } from "@/lib/utils";

const NAVY = "#0d1f3c";
const GOLD = "#f5a623";
/** Wordmark: trust navy + alert red (not gold) */
const WORDMARK_NAVY = "#0B1F3A";
const SCAM_ALERT_RED = "#E53935";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/verify-resort", label: "Verify Resort", icon: Shield },
  { href: "/about", label: "About" },
  { href: "/blogs", label: "Blogs" },
  { href: "/contact", label: "Contact" },
] as const;

/** Headline lines — scaled up slightly while staying nowrap in the hero column. */
const HERO_HEADLINE_ROW =
  "block whitespace-nowrap text-[clamp(1.12rem,5.5vw+0.5rem,3.25rem)] lg:text-[clamp(1.02rem,1.82vw+0.52rem,1.92rem)] xl:text-[clamp(1.06rem,1.92vw+0.48rem,2.1rem)] 2xl:text-[clamp(1.12rem,2.02vw+0.45rem,2.55rem)]";

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

type PricingCardProps = {
  label: string;
  original: string;
  price: string;
  note: string;
  highlight: boolean;
  badge?: string;
};

function PricingCard({ label, original, price, note, highlight, badge }: PricingCardProps) {
  const pricePx = highlight ? 38 : 34;
  return (
    <div
      className="relative flex flex-col items-center rounded-xl p-4 text-center sm:p-5"
      style={{
        backgroundColor: highlight ? NAVY : "#fff",
        border: highlight ? `3px solid #ffd47a` : "2px solid #94a3b8",
        boxShadow: highlight
          ? "inset 0 1px 0 rgba(255,212,122,0.22), 0 0 0 2px rgba(245,166,35,0.55), 0 0 28px rgba(245,166,35,0.28), 0 10px 36px rgba(13,31,60,0.2)"
          : "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {badge ? (
        <span
          className="absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center justify-center isolate overflow-hidden whitespace-nowrap rounded-full border border-amber-200/50 px-4 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_14px_rgba(180,110,0,0.32)] [text-shadow:0_1px_0_rgba(0,0,0,0.12)]"
          style={registerGoldButtonStyle}
        >
          <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
          <span className="relative z-10">{badge}</span>
        </span>
      ) : null}

      <p
        className="font-pop mb-2 text-[11px] font-semibold uppercase tracking-wide sm:text-xs"
        style={{
          color: highlight ? GOLD : "#111",
        }}
      >
        {label}
      </p>

      <p
        className="mb-0.5 text-[13px] font-normal line-through"
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", color: "#c0392b" }}
      >
        {original}
      </p>

      <div className="flex items-baseline gap-1">
        <span
          className={highlight ? "font-black leading-none" : "font-bold leading-none tracking-tight"}
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: highlight ? `${pricePx}px` : `${pricePx - 4}px`,
            color: highlight ? GOLD : "#111",
          }}
        >
          {price}
        </span>
        <span
          className="mb-1 text-xs font-normal"
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            color: highlight ? "#b0bcd4" : "#777",
          }}
        >
          /month
        </span>
      </div>

      <p
        className="mb-3 mt-1 text-[11px] font-normal sm:text-xs"
        style={{
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          color: highlight ? GOLD : "#666",
        }}
      >
        {note}
      </p>

      {highlight ? (
        <Link
          href="/register"
          className={cn(
            REGISTER_GOLD_SHINE_BASE,
            "inline-flex w-full justify-center rounded-lg py-2 text-[12px] font-extrabold sm:text-[13px]"
          )}
          style={registerGoldButtonStyle}
        >
          <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
          <span className="relative z-10">Get Started</span>
        </Link>
      ) : (
        <Link
          href="/register"
          className="w-full rounded-lg py-2 text-center text-[12px] font-extrabold text-white transition hover:opacity-95 sm:text-[13px]"
          style={{
            backgroundColor: NAVY,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          }}
        >
          Get Started
        </Link>
      )}
    </div>
  );
}

export function LandingPremiumPage() {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-w-0 origin-top overflow-x-hidden bg-white font-body text-[#111] antialiased [zoom:1.05]">
      {/* ── Hero + glass nav over image (nav does not stack above hero) ── */}
      <section className="relative isolate overflow-hidden lg:pb-2">
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
                "linear-gradient(to right, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 7%, rgba(255,255,255,0.62) 28%, rgba(255,255,255,0.08) 48%, rgba(255,255,255,0) 62%)",
            }}
            aria-hidden
          />
        </div>

        {/* Floating glass nav — over the photo, no solid bar, no border */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-40 pt-[max(0.35rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto mx-auto w-full max-w-[min(1360px,100%)] pb-1.5 ps-0.5 pe-4 pt-0.5 sm:ps-1 sm:pe-5 md:ps-1 md:pe-6 lg:ps-2 lg:pe-8">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
              <Link
                href="/"
                className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3"
                onClick={() => setMobileNav(false)}
              >
                <ImageWithFallback
                  src="/mainlogo.png"
                  alt="Anti-Scam PH Logo"
                  width={112}
                  height={112}
                  className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] sm:h-11 sm:w-11"
                  sizes="56px"
                />
                <div className="min-w-0 leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">
                  <div className="flex items-baseline">
                    <span className="font-pop whitespace-nowrap text-[17px] font-extrabold uppercase tracking-[0.07em] sm:text-[19px]">
                      <span style={{ color: WORDMARK_NAVY }}>ANTI-</span>
                      <span style={{ color: SCAM_ALERT_RED }}>SCAM</span>
                      <span style={{ color: WORDMARK_NAVY }}> PH</span>
                    </span>
                  </div>
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#0B1F3A]/75 sm:text-[10px]"
                    style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                  >
                    Verified resort platform
                  </p>
                </div>
              </Link>

              <nav className="hidden items-center justify-center gap-0.5 md:flex md:flex-1 lg:gap-1">
                {navItems.map((item) => {
                  const isHome = item.href === "/";
                  const Icon = "icon" in item ? item.icon : null;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileNav(false)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[#0d1f3c] backdrop-blur-md transition-colors duration-150 xl:px-4",
                        isHome
                          ? "bg-white/40 font-bold hover:bg-white/50"
                          : "bg-transparent hover:bg-white/28"
                      )}
                      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                    >
                      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} aria-hidden /> : null}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/login"
                  className="hidden items-center gap-2 rounded-full border-2 border-white/85 bg-white/55 px-4 py-2 text-sm font-bold text-[#0d1f3c] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md transition hover:bg-white/75 sm:inline-flex"
                  style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                >
                  <Users className="h-4 w-4 shrink-0" aria-hidden />
                  Log in
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    REGISTER_GOLD_SHINE_REGISTER_BTN,
                    "gap-2 rounded-full px-4 py-2 text-sm font-bold sm:px-5"
                  )}
                  style={registerGoldButtonStyle}
                >
                  <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
                  <Building
                    className="relative z-10 h-4 w-4 shrink-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]"
                    aria-hidden
                  />
                  <span className="relative z-10 max-[380px]:sr-only">Register Your Resort</span>
                  <span className="relative z-10 hidden max-[380px]:inline">Register</span>
                </Link>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/65 bg-white/25 text-[#0d1f3c] backdrop-blur-md transition hover:bg-white/40 md:hidden"
                  aria-label={mobileNav ? "Close menu" : "Open menu"}
                  aria-expanded={mobileNav}
                  onClick={() => setMobileNav((o) => !o)}
                >
                  {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {mobileNav ? (
              <nav
                className="mt-2 flex max-h-[min(70vh,24rem)] flex-col gap-1 overflow-y-auto rounded-2xl border-2 border-white/70 bg-white/40 p-2 backdrop-blur-2xl md:hidden"
                aria-label="Mobile"
              >
                {navItems.map((item) => {
                  const isHome = item.href === "/";
                  const Icon = "icon" in item ? item.icon : null;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileNav(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0d1f3c] transition hover:bg-white/45",
                        isHome && "bg-white/50 font-bold"
                      )}
                      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                    >
                      {Icon ? <Icon className="h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden /> : null}
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  href="/login"
                  onClick={() => setMobileNav(false)}
                  className="mt-1 flex items-center justify-center gap-2 rounded-xl border-2 border-white/85 bg-white/60 py-2.5 text-sm font-bold text-[#0d1f3c] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md sm:hidden"
                  style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                >
                  <Users className="h-4 w-4" aria-hidden />
                  Log in
                </Link>
              </nav>
            ) : null}
          </div>
        </header>

        <div className="relative z-10 mx-auto grid w-full max-w-[min(1360px,100%)] grid-cols-1 items-start gap-3 pb-6 pt-[max(6.75rem,calc(env(safe-area-inset-top)+5rem))] ps-[max(0.25rem,env(safe-area-inset-left))] pe-5 sm:gap-4 sm:ps-0.5 sm:pe-6 sm:pt-[max(7rem,calc(env(safe-area-inset-top)+5.25rem))] md:ps-1 md:pe-7 md:pt-[max(6.75rem,calc(env(safe-area-inset-top)+4.75rem))] lg:grid-cols-12 lg:items-center lg:gap-x-4 lg:gap-y-2 lg:pb-5 lg:ps-1 lg:pe-10 lg:pt-[max(5.25rem,calc(env(safe-area-inset-top)+4.15rem))] xl:pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.35rem))] 2xl:pt-[max(5.75rem,calc(env(safe-area-inset-top)+4.5rem))] xl:ps-2">
          {/* Left — nudged further left (tight page gutter + slight translate on large screens) */}
          <div className="z-10 min-w-0 lg:col-span-4 lg:-translate-x-3 xl:-translate-x-6 2xl:-translate-x-8">
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-5 w-5 shrink-0 text-gray-500 sm:h-[1.35rem] sm:w-[1.35rem]" aria-hidden />
              <span
                className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#555] sm:text-[14px]"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                The Philippines&rsquo; verified resort platform
              </span>
            </div>

            <h1 className="font-pop m-0 max-w-full font-extrabold leading-[1.06] tracking-tight">
              <span className={HERO_HEADLINE_ROW} style={{ color: WORDMARK_NAVY }}>
                Protect Your Resort.
              </span>
              <span className={HERO_HEADLINE_ROW} style={{ color: WORDMARK_NAVY }}>
                Build Guest Trust.
              </span>
              <span className={HERO_HEADLINE_ROW} style={{ color: GOLD }}>
                Increase Direct Bookings.
              </span>
            </h1>

            <p
              className="mt-3 max-w-xl text-pretty text-[15px] font-medium leading-relaxed text-[#444] sm:max-w-2xl sm:text-[16px]"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              Anti-Scam PH helps Philippine resorts prevent fake bookings, avoid double reservations, and gain guest trust
              through verified booking technology.
            </p>

            <div className="mt-4.0 flex flex-nowrap items-center gap-2 sm:gap-2.5">
              <Link
                href="/register"
                className={cn(
                  REGISTER_GOLD_SHINE_REGISTER_BTN,
                  "min-w-0 flex-1 gap-2 rounded-lg px-3 py-2.5 text-[13px] font-extrabold sm:flex-none sm:px-6 sm:py-3 sm:text-base"
                )}
                style={registerGoldButtonStyle}
              >
                <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
                <Building className="relative z-10 h-[1.125rem] w-[1.125rem] shrink-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.15)] sm:h-5 sm:w-5" aria-hidden />
                <span className="relative z-10">Register Your Resort →</span>
              </Link>
              <Link
                href="#product-demo"
                className="relative isolate inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-lg border-2 border-slate-500/85 bg-gradient-to-b from-white to-slate-100 px-3 py-2.5 text-[13px] font-extrabold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(15,23,42,0.07),0_4px_12px_rgba(15,23,42,0.06)] transition hover:brightness-[1.03] active:brightness-[0.99] sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                <span
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_0%,transparent_40%,rgba(255,255,255,0.55)_50%,transparent_60%,transparent_100%)] opacity-70"
                  aria-hidden
                />
                <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-800 bg-gradient-to-br from-white to-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:h-7 sm:w-7">
                  <Play className="h-3 w-3 fill-slate-800 text-slate-800 sm:h-3.5 sm:w-3.5" aria-hidden />
                </span>
                <span className="relative z-10">See Demo</span>
              </Link>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[#555] sm:gap-x-4 sm:gap-y-3">
              {[
                { icon: Shield, label: "SEC Registered Company" },
                { icon: MapPin, label: "Philippine-Based Support" },
                { icon: CheckCircle, label: "Verified Resort Badge System" },
                { icon: Lock, label: "Secure Reservation Processing" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex min-w-0 items-start gap-2">
                  <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" aria-hidden />
                  <span className="min-w-0 text-[12px] font-semibold leading-snug sm:text-[13px]" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Center badge — compact for above-the-fold pricing */}
          <div className="z-10 flex justify-center lg:col-span-4">
            <ImageWithFallback
              src="/founding500.png"
              alt="Founding 500 — verified resort partners"
              width={560}
              height={620}
              className="h-auto w-[15.5rem] max-w-full object-contain object-center drop-shadow-2xl sm:w-[18rem] md:w-[19.5rem] lg:w-[20rem] xl:w-[22rem] 2xl:w-[24rem]"
              sizes="(max-width: 640px) 248px, (max-width: 768px) 288px, (max-width: 1024px) 312px, (max-width: 1280px) 320px, (max-width: 1536px) 352px, 384px"
              priority
            />
          </div>

          {/* Right feature card */}
          <div id="product-demo" className="z-10 scroll-mt-28 lg:col-span-4">
            <div
              className="space-y-3 rounded-xl border-2 border-white/30 p-4 shadow-xl ring-2 ring-black/10 sm:space-y-3.5 sm:rounded-2xl sm:p-5"
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
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 sm:h-[1.35rem] sm:w-[1.35rem]" style={{ color: GOLD }} aria-hidden />
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

      {/* ── Pricing (tight to hero — goal: visible on first paint on desktop) ── */}
      <section className="border-t-2 border-slate-300 bg-white py-4 pl-4 pr-5 sm:py-5 sm:pl-4 sm:pr-6 md:pl-5 md:pr-7 lg:py-4 lg:pl-6 lg:pr-10">
        <div className="mx-auto w-full max-w-[min(1100px,100%)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-3">
            <PricingCard label="MONTHLY PLAN" original="₱3,000" price="₱2,100" note="Perfect for startup resorts" highlight={false} />
            <PricingCard label="3-MONTH PLAN" original="₱2,700" price="₱1,900" note="Save ₱2,400 vs monthly" highlight={false} />
            <PricingCard label="6-MONTH PLAN" original="₱2,500" price="₱1,700" note="Save ₱7,800 vs monthly" highlight={false} />
            <PricingCard
              label="12-MONTH PLAN"
              original="₱2,300"
              price="₱1,500"
              note="Save ₱9,600 yearly"
              highlight
              badge="BEST VALUE"
            />
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-t-2 border-slate-300 bg-white py-6 pl-4 pr-5 sm:pl-4 sm:pr-6 md:pl-5 md:pr-7 lg:py-5 lg:pl-6 lg:pr-10" aria-label="Trust and values">
        <div className="mx-auto grid w-full max-w-[min(1100px,100%)] grid-cols-2 gap-4 md:grid-cols-5 md:gap-5">
          {[
            {
              icon: <Shield className="mx-auto h-7 w-7 text-gray-700" aria-hidden />,
              text: "Stronger Resorts. Safer Guests. Better Business.",
            },
            {
              icon: <Users className="mx-auto h-7 w-7 text-gray-700" aria-hidden />,
              text: "Together, let's build a trusted resort industry in the Philippines.",
            },
            {
              icon: (
                <ImageWithFallback
                  src="/phcircle.png"
                  alt="Philippines"
                  width={56}
                  height={56}
                  className="mx-auto h-7 w-7 rounded-full object-cover shadow-sm ring-1 ring-black/10"
                />
              ),
              text: "Proudly Filipino. Built for Philippine Resorts.",
            },
            {
              icon: <Phone className="mx-auto h-7 w-7 text-gray-700" aria-hidden />,
              text: "Real People. Real Support. We're here to help.",
            },
            {
              icon: <Shield className="mx-auto h-7 w-7 text-gray-700" aria-hidden />,
              text: "Your Partner in Growth and Guest Trust.",
            },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 text-center">
              {item.icon}
              <p
                className="text-xs font-semibold leading-snug text-[#333]"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer bar ── */}
      <footer
        className="border-t-2 border-white/25 py-3 pl-4 pr-5 text-center sm:pl-4 sm:pr-6 md:pl-5 md:pr-7 lg:pl-6 lg:pr-10"
        style={{ backgroundColor: NAVY }}
      >
        <span
          className="inline-flex flex-wrap items-center justify-center gap-2 text-[13px] font-bold text-white"
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
        >
          <Lock className="h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden />
          Founding rates are locked as long as your subscription remains active.
        </span>
      </footer>
    </div>
  );
}
