"use client";

/**
 * Marketing site navigation (home, about, blogs, contact, auth).
 * - Desktop / tablet: inline `md:flex` link row — layout owned by `desktopLinkClass()` + shell classes below.
 * - Mobile-only: hamburger + collapsible glass panel (`md:hidden`, larger tap targets, safe-area padding).
 * - Below `md`, Register appears in the top action row (beside the menu toggle) and again in the mobile drawer.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Gift, Menu, Shield, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { useAuth } from "@/contexts/AuthContext";
import { getOwnerLandingPage } from "@/lib/api/landingPage";
import { isBusinessProPlan } from "@/lib/subscriptionPlans";
import { cn } from "@/lib/utils";
import { ResortGrowthRewardsProgramModal } from "@/components/layout/ResortGrowthRewardsProgramModal";
import { VerifyResortComingSoonModal } from "@/components/layout/VerifyResortComingSoonModal";
import { useRegisterModal } from "@/contexts/RegisterModalContext";

const GOLD = "#f5a623";
const WORDMARK_NAVY = "#0B1F3A";
const SCAM_ALERT_RED = "#E53935";

const REGISTER_GOLD_BACKGROUND = `linear-gradient(165deg, #ffd47a 0%, ${GOLD} 40%, #c9840f 100%)`;
const REGISTER_GOLD_SHINE_CORE =
  "relative isolate inline-flex items-center overflow-hidden text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_5px_14px_rgba(180,110,0,0.22)] transition [text-shadow:0_1px_0_rgba(0,0,0,0.12)] hover:brightness-[1.05] active:brightness-[0.98]";
const REGISTER_GOLD_SHINE_REGISTER_BTN = `${REGISTER_GOLD_SHINE_CORE} border-2 border-amber-950/45`;
const REGISTER_GOLD_GLOSS_LAYER =
  "pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_0%,transparent_42%,rgba(255,255,255,0.22)_50%,transparent_58%,transparent_100%)] opacity-90";

const registerGoldButtonStyle = {
  background: REGISTER_GOLD_BACKGROUND,
  fontFamily: "var(--font-inter), system-ui, sans-serif",
} as const;

const LINK_HREF = {
  home: "/",
  about: "/about",
  plans: "/plans",
  blogs: "/blogs",
  contact: "/contact",
} as const;

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type MarketingPremiumNavbarMode = "hero" | "marketing-solid" | "auth-overlay";

type Props = {
  mode: MarketingPremiumNavbarMode;
};

export function MarketingPremiumNavbar({ mode }: Props) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileNav, setMobileNav] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const { openRegisterModal } = useRegisterModal();
  const [programOpen, setProgramOpen] = useState(false);
  const [rewardsEligible, setRewardsEligible] = useState(true);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  useEffect(() => {
    if (!user || user.role !== "resort_owner") {
      setRewardsEligible(true);
      return;
    }
    let cancelled = false;
    void getOwnerLandingPage()
      .then((lp) => {
        if (!cancelled) {
          setRewardsEligible(isBusinessProPlan(lp.subscription_plan, lp.subscription_status));
        }
      })
      .catch(() => {
        if (!cancelled) setRewardsEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function desktopLinkClass(href: string, isHome: boolean) {
    if (mode === "hero") {
      return cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[#0d1f3c] backdrop-blur-md transition-colors duration-150 xl:px-4",
        isHome ? "bg-white/40 font-bold hover:bg-white/50" : "bg-transparent hover:bg-white/28",
      );
    }
    if (mode === "marketing-solid") {
      return cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[#0d1f3c] transition-colors duration-150 xl:px-4",
        isHome
          ? "bg-navy/[0.1] font-bold shadow-sm ring-1 ring-navy/10 backdrop-blur-sm hover:bg-navy/[0.14]"
          : "bg-zinc-100/90 ring-1 ring-zinc-200/80 backdrop-blur-sm hover:bg-zinc-200/90",
      );
    }
    /* auth-overlay */
    if (mode === "auth-overlay" && isHome) {
      return cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[#0d1f3c] backdrop-blur-md transition-colors duration-150 xl:px-4",
        isNavActive(pathname, href) ? "bg-white/50 font-bold shadow-sm" : "bg-white/35 hover:bg-white/45",
      );
    }
    if (mode === "auth-overlay" && !isHome) {
      return cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[#0d1f3c] backdrop-blur-md transition-colors duration-150 ring-1 ring-white/55 xl:px-4",
        isNavActive(pathname, href)
          ? "bg-white/90 font-bold shadow-md ring-white/70"
          : "bg-white/65 hover:bg-white/85 shadow-sm",
      );
    }
    return cn(
      "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[#0d1f3c] backdrop-blur-md transition-colors duration-150 xl:px-4",
      isNavActive(pathname, href)
        ? "bg-white/50 font-bold shadow-sm"
        : "bg-white/25 hover:bg-white/40",
    );
  }

  function verifyButtonClass() {
    if (mode === "hero")
      return "flex items-center gap-1.5 rounded-full bg-transparent px-3.5 py-2 text-sm font-semibold text-[#0d1f3c] backdrop-blur-md transition-colors hover:bg-white/28 xl:px-4";
    if (mode === "marketing-solid")
      return "flex items-center gap-1.5 rounded-full bg-zinc-100/90 px-3.5 py-2 text-sm font-semibold text-[#0d1f3c] ring-1 ring-zinc-200/80 backdrop-blur-sm transition-colors hover:bg-zinc-200/90 xl:px-4";
    if (mode === "auth-overlay")
      return "flex items-center gap-1.5 rounded-full bg-white/65 px-3.5 py-2 text-sm font-semibold text-[#0d1f3c] shadow-sm ring-1 ring-white/55 backdrop-blur-md transition-colors hover:bg-white/85 xl:px-4";
    return "flex items-center gap-1.5 rounded-full bg-white/25 px-3.5 py-2 text-sm font-semibold text-[#0d1f3c] backdrop-blur-md transition-colors hover:bg-white/40 xl:px-4";
  }

  function mobilePanelClass() {
    if (mode === "hero")
      return "mt-2 flex max-h-[min(72vh,28rem)] flex-col gap-1 overflow-y-auto rounded-2xl border-2 border-white/70 bg-white/40 p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-2xl md:hidden";
    if (mode === "marketing-solid")
      return "mt-2 flex max-h-[min(72vh,28rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white/95 p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-xl md:hidden";
    return "mt-2 flex max-h-[min(72vh,28rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-white/55 bg-white/80 p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-2xl md:hidden";
  }

  function mobileRowClass(isHome: boolean) {
    if (mode === "hero")
      return cn(
        "flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0d1f3c] transition hover:bg-white/45",
        isHome && "bg-white/50 font-bold",
      );
    if (mode === "marketing-solid")
      return cn(
        "flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0d1f3c] transition hover:bg-zinc-100",
        isHome && "bg-navy/[0.08] font-bold",
      );
    if (mode === "auth-overlay") {
      return cn(
        "flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0d1f3c] transition hover:bg-white/55",
        isHome && "bg-white/50 font-bold",
      );
    }
    return cn(
      "flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0d1f3c] transition hover:bg-white/35",
      isHome && "bg-navy/[0.08] font-bold",
    );
  }

  const headerShell =
    mode === "hero"
      ? "pointer-events-none absolute inset-x-0 top-0 z-40 pt-[max(0.35rem,env(safe-area-inset-top))]"
      : mode === "auth-overlay"
        ? "pointer-events-none fixed inset-x-0 top-0 z-50 pt-[max(0.35rem,env(safe-area-inset-top))]"
        : "sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 pt-[max(0.35rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-xl";

  const wordmarkShadow = mode === "hero" ? "drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]" : "";

  const menuBtnClass =
    mode === "hero"
      ? "inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/65 bg-white/25 text-[#0d1f3c] backdrop-blur-md transition hover:bg-white/40 md:hidden"
      : mode === "marketing-solid"
        ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300/90 bg-white text-[#0d1f3c] shadow-sm transition hover:bg-zinc-50 md:hidden"
        : "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/65 text-[#0d1f3c] shadow-sm backdrop-blur-md transition hover:bg-white/85 md:hidden";

  const loginClass =
    mode === "hero"
      ? "hidden items-center gap-2 rounded-full border-2 border-white/85 bg-white/55 px-4 py-2 text-sm font-bold text-[#0d1f3c] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md transition hover:bg-white/75 sm:inline-flex"
      : mode === "marketing-solid"
        ? "hidden items-center gap-2 rounded-full border border-zinc-300/90 bg-white px-4 py-2 text-sm font-bold text-[#0d1f3c] shadow-sm transition hover:bg-zinc-50 sm:inline-flex"
        : "hidden items-center gap-2 rounded-full border-2 border-white/85 bg-white/70 px-4 py-2 text-sm font-bold text-[#0d1f3c] shadow-sm backdrop-blur-md transition hover:bg-white/90 sm:inline-flex";

  const inner = (
    <div
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-[min(1360px,100%)] pb-1.5 ps-0.5 pe-4 pt-0.5 sm:ps-1 sm:pe-5 md:ps-1 md:pe-6 lg:ps-2 lg:pe-8",
        mode === "hero" && "max-lg:pb-0",
      )}
    >
      {/* One top row on mobile: wordmark (left) + actions/menu (right). `md:flex-wrap` restores comfortable wrapping for tablet/desktop clusters. */}
      <div className="flex flex-nowrap items-center justify-between gap-x-2 gap-y-0 md:flex-wrap md:items-center md:gap-y-1.5">
        <Link
          href="/"
          className={cn("flex min-w-0 flex-1 items-center gap-2.5 pr-1 sm:gap-3 md:flex-none md:pr-0", wordmarkShadow)}
          onClick={() => setMobileNav(false)}
        >
          <ImageWithFallback
            src="/branding/mainlogo.png"
            alt="Anti-Scam PH Logo"
            width={112}
            height={112}
            className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] sm:h-11 sm:w-11"
            sizes="56px"
          />
          <div className={cn("min-w-0 leading-tight", wordmarkShadow)}>
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
          <Link
            href={LINK_HREF.home}
            className={desktopLinkClass(LINK_HREF.home, true)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            Home
          </Link>
          <button
            type="button"
            className={cn(verifyButtonClass(), "font-semibold")}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            onClick={() => setVerifyOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={verifyOpen}
          >
            <Shield className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} aria-hidden />
            Verify Resort
          </button>
          <Link
            href={LINK_HREF.about}
            className={desktopLinkClass(LINK_HREF.about, false)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            About
          </Link>
          <Link
            href={LINK_HREF.plans}
            className={desktopLinkClass(LINK_HREF.plans, false)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            Plans
          </Link>
          <Link
            href={LINK_HREF.blogs}
            className={desktopLinkClass(LINK_HREF.blogs, false)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            Blogs
          </Link>
          <Link
            href={LINK_HREF.contact}
            className={desktopLinkClass(LINK_HREF.contact, false)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            Contact
          </Link>
          <button
            type="button"
            className={cn(verifyButtonClass(), "font-semibold")}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            onClick={() => setProgramOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={programOpen}
          >
            <Gift className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} aria-hidden />
            Program
          </button>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {!loading && user ? (
            <>
              <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-[#0d1f3c] sm:inline md:max-w-[14rem]" title={user.email}>
                {user.name}
              </span>
              <Link
                href="/dashboard"
                className={cn(
                  "hidden rounded-full px-4 py-2 text-sm font-bold transition sm:inline-flex",
                  mode === "marketing-solid"
                    ? "border border-navy/15 bg-white text-[#0d1f3c] shadow-sm hover:bg-zinc-50"
                    : "border-2 border-white/85 bg-white/55 text-[#0d1f3c] backdrop-blur-md hover:bg-white/75",
                )}
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={loginClass} style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }} onClick={() => setMobileNav(false)}>
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                Log in
              </Link>
              <button
                type="button"
                className={cn(
                  REGISTER_GOLD_SHINE_REGISTER_BTN,
                  "gap-1.5 rounded-full px-3 py-2 text-xs font-bold md:hidden",
                )}
                style={registerGoldButtonStyle}
                onClick={() => {
                  setMobileNav(false);
                  openRegisterModal();
                }}
              >
                <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
                <Building className="relative z-10 h-3.5 w-3.5 shrink-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]" aria-hidden />
                <span className="relative z-10">Register</span>
              </button>
              <span className="hidden md:contents">
                <button
                  type="button"
                  className={cn(REGISTER_GOLD_SHINE_REGISTER_BTN, "gap-2 rounded-full px-4 py-2 text-sm font-bold sm:px-5")}
                  style={registerGoldButtonStyle}
                  onClick={() => {
                    setMobileNav(false);
                    openRegisterModal();
                  }}
                >
                  <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
                  <Building className="relative z-10 h-4 w-4 shrink-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]" aria-hidden />
                  Register
                </button>
              </span>
            </>
          )}
          <button
            type="button"
            className={menuBtnClass}
            aria-label={mobileNav ? "Close menu" : "Open menu"}
            aria-expanded={mobileNav}
            onClick={() => setMobileNav((o) => !o)}
          >
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileNav ? (
        <nav className={mobilePanelClass()} aria-label="Mobile">
          <Link
            href={LINK_HREF.home}
            className={mobileRowClass(true)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            onClick={() => setMobileNav(false)}
          >
            Home
          </Link>
          <button
            type="button"
            className={mobileRowClass(false)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            onClick={() => {
              setMobileNav(false);
              setVerifyOpen(true);
            }}
          >
            <Shield className="h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden />
            Verify Resort
          </button>
          <Link
            href={LINK_HREF.about}
            className={mobileRowClass(false)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            onClick={() => setMobileNav(false)}
          >
            About
          </Link>
          <Link
            href={LINK_HREF.plans}
            className={mobileRowClass(false)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            onClick={() => setMobileNav(false)}
          >
            Plans
          </Link>
          <Link
            href={LINK_HREF.blogs}
            className={mobileRowClass(false)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            onClick={() => setMobileNav(false)}
          >
            Blogs
          </Link>
          <Link
            href={LINK_HREF.contact}
            className={mobileRowClass(false)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            onClick={() => setMobileNav(false)}
          >
            Contact
          </Link>
          <button
            type="button"
            className={mobileRowClass(false)}
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            onClick={() => {
              setMobileNav(false);
              setProgramOpen(true);
            }}
          >
            <Gift className="h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden />
            Program
          </button>
          {!loading && user ? (
            <Link
              href="/dashboard"
              className="mt-1 flex items-center justify-center rounded-xl border-2 border-navy/15 bg-white py-2.5 text-sm font-bold text-[#0d1f3c] sm:hidden"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              onClick={() => setMobileNav(false)}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <button
                type="button"
                className={cn(
                  REGISTER_GOLD_SHINE_REGISTER_BTN,
                  "mt-1 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold md:hidden",
                )}
                style={registerGoldButtonStyle}
                onClick={() => {
                  setMobileNav(false);
                  openRegisterModal();
                }}
              >
                <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
                <Building className="relative z-10 h-4 w-4 shrink-0" aria-hidden />
                <span className="relative z-10">Register Your Resort</span>
              </button>
              <Link
                href="/login"
                onClick={() => setMobileNav(false)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold backdrop-blur-md md:hidden",
                  mode === "hero" || mode === "auth-overlay"
                    ? "border-white/85 bg-white/60 text-[#0d1f3c]"
                    : "border-zinc-200 bg-white text-[#0d1f3c] shadow-sm",
                )}
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                <Users className="h-4 w-4" aria-hidden />
                Log in
              </Link>
            </>
          )}
        </nav>
      ) : null}
    </div>
  );

  return (
    <>
      <header className={headerShell}>{inner}</header>
      <VerifyResortComingSoonModal open={verifyOpen} onClose={() => setVerifyOpen(false)} />
      <ResortGrowthRewardsProgramModal
        open={programOpen}
        onClose={() => setProgramOpen(false)}
        eligible={rewardsEligible}
      />
    </>
  );
}
