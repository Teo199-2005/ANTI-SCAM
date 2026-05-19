"use client";

/**
 * Sticky top bar for public `/resort/{slug}` pages.
 * Layout rhythm (logo + stacked title, pill nav, auth cluster) is informed by the marketing navbar,
 * but content is resort-specific and styling is simplified for a light, always-on-surface bar.
 * Auth cluster defaults to Log in / Register for anonymous visitors; optional Dashboard when
 * {@link Props.showDashboardLink} is set (e.g. signed-in guest on checkout).
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BedDouble,
  BookOpen,
  Building2,
  LayoutDashboard,
  MapPin,
  Menu,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { buildLoginUrl, buildRegisterUrl } from "@/lib/auth/clientAuthUrls";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { cn } from "@/lib/utils";

const GOLD = "#f5a623";
const REGISTER_GOLD_BACKGROUND = `linear-gradient(165deg, #ffd47a 0%, ${GOLD} 40%, #c9840f 100%)`;
const REGISTER_GOLD_SHINE_CORE =
  "relative isolate inline-flex items-center justify-center overflow-hidden text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_5px_14px_rgba(180,110,0,0.22)] transition [text-shadow:0_1px_0_rgba(0,0,0,0.12)] hover:brightness-[1.05] active:brightness-[0.98]";
const REGISTER_GOLD_SHINE_REGISTER_BTN = `${REGISTER_GOLD_SHINE_CORE} border-2 border-amber-950/45`;
const REGISTER_GOLD_GLOSS_LAYER =
  "pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_0%,transparent_42%,rgba(255,255,255,0.22)_50%,transparent_58%,transparent_100%)] opacity-90";

const registerGoldButtonStyle = {
  background: REGISTER_GOLD_BACKGROUND,
  fontFamily: "var(--font-inter), system-ui, sans-serif",
} as const;

const pill =
  "inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white/90 px-3 py-2 text-sm font-semibold text-navy shadow-sm backdrop-blur-sm transition hover:border-zinc-300 hover:bg-zinc-50 md:px-3.5";

type Props = {
  resortName: string;
  logoUrl: string | null;
  listingSlug: string;
  hasAbout: boolean;
  hasMap: boolean;
  /** When set (e.g. `/resort/slug`), logo and section pills navigate to the public landing with anchors. */
  landingHrefBase?: string;
  /** Signed-in guest / user during checkout — show Dashboard instead of Log in / Register. */
  showDashboardLink?: boolean;
};

type ResortPublicNavPillsProps = {
  hasAbout: boolean;
  hasMap: boolean;
  onAfterNavigate?: () => void;
  landingHrefBase?: string;
};

function sectionHref(anchor: string, landingHrefBase?: string) {
  return landingHrefBase ? `${landingHrefBase}${anchor}` : anchor;
}

/** Section anchor pills — module scope so the component identity is stable across parent re-renders. */
function ResortPublicNavPills({ hasAbout, hasMap, onAfterNavigate, landingHrefBase }: ResortPublicNavPillsProps) {
  const close = () => onAfterNavigate?.();
  return (
    <>
      <a href={sectionHref("#rooms", landingHrefBase)} className={pill} onClick={close}>
        <BedDouble className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
        Our rooms
      </a>
      {hasAbout ? (
        <a href={sectionHref("#about", landingHrefBase)} className={pill} onClick={close}>
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
          About
        </a>
      ) : null}
      {hasMap ? (
        <a href={sectionHref("#map", landingHrefBase)} className={pill} onClick={close}>
          <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
          Find us
        </a>
      ) : null}
    </>
  );
}

export function ResortPublicNavbar({
  resortName,
  logoUrl,
  listingSlug,
  hasAbout,
  hasMap,
  landingHrefBase,
  showDashboardLink,
}: Props) {
  const [open, setOpen] = useState(false);
  const logoSrc = logoUrl ? laravelPublicUrl(logoUrl) : "";

  useEffect(() => {
    setOpen(false);
  }, [listingSlug]);

  const resortParam = listingSlug.trim();
  const returnTo = resortParam ? `/resort/${encodeURIComponent(resortParam)}` : null;
  const loginHref = buildLoginUrl({ intent: "client", returnTo });
  const registerHref = buildRegisterUrl({ intent: "client", returnTo, resortSlug: resortParam || null });
  const topHref = sectionHref("#top", landingHrefBase);
  const showAuthCluster = !showDashboardLink;

  return (
    <header
      className="sticky top-0 z-[100] border-b border-zinc-200/85 bg-white/92 pt-[max(0.35rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-xl"
      role="banner"
    >
      <div className="resort-landing-container px-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] pb-2 pt-1 sm:px-6 md:px-8 lg:px-10">
        <div className="flex flex-nowrap items-center justify-between gap-2 md:gap-3">
          <a
            href={topHref}
            className="flex min-w-0 flex-1 items-center gap-2.5 pr-1 sm:gap-3 md:flex-none"
            onClick={() => setOpen(false)}
          >
            {logoSrc ? (
              <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-zinc-200/80 bg-white p-0.5 shadow-sm sm:h-10 sm:w-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt=""
                  className="h-full w-full origin-center object-contain scale-[1.22] sm:scale-[1.18]"
                />
              </span>
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-zinc-400 sm:h-10 sm:w-10">
                <Building2 className="h-5 w-5" aria-hidden />
              </span>
            )}
            <div className="min-w-0 leading-tight">
              <p className="truncate font-pop text-[15px] font-extrabold uppercase tracking-[0.06em] text-navy sm:text-[17px]">
                {resortName}
              </p>
              <p
                className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-navy/65 sm:text-[10px]"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                Guest listing · Anti-Scam PH
              </p>
            </div>
          </a>

          <nav className="hidden items-center justify-center gap-1 md:flex md:flex-1 lg:gap-1.5" aria-label="Page sections">
            <ResortPublicNavPills hasAbout={hasAbout} hasMap={hasMap} landingHrefBase={landingHrefBase} />
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {showAuthCluster ? (
              <>
                <Link
                  href={loginHref}
                  className="hidden items-center gap-1.5 rounded-full border border-zinc-300/90 bg-white px-3.5 py-2 text-sm font-bold text-navy shadow-sm transition hover:bg-zinc-50 sm:inline-flex"
                  style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                >
                  <Users className="h-4 w-4 shrink-0" aria-hidden />
                  Log in
                </Link>
                <Link
                  href={registerHref}
                  className={cn(REGISTER_GOLD_SHINE_REGISTER_BTN, "hidden rounded-full px-3.5 py-2 text-sm font-bold sm:inline-flex")}
                  style={registerGoldButtonStyle}
                >
                  <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
                  <UserRound className="relative z-10 h-4 w-4 shrink-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.12)]" aria-hidden />
                  <span className="relative z-10">Register</span>
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="hidden items-center gap-1.5 rounded-full border border-zinc-300/90 bg-white px-3.5 py-2 text-sm font-bold text-navy shadow-sm transition hover:bg-zinc-50 sm:inline-flex"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
                Dashboard
              </Link>
            )}
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300/90 bg-white text-navy shadow-sm transition hover:bg-zinc-50 md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open ? (
          <nav
            className="mt-2 flex max-h-[min(70vh,24rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white/95 p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-xl md:hidden"
            aria-label="Page sections"
          >
            <div className="flex flex-col gap-1">
              <ResortPublicNavPills
                hasAbout={hasAbout}
                hasMap={hasMap}
                landingHrefBase={landingHrefBase}
                onAfterNavigate={() => setOpen(false)}
              />
            </div>
            {showAuthCluster ? (
              <>
                <Link
                  href={loginHref}
                  className="mt-1 flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-sm font-bold text-navy"
                  onClick={() => setOpen(false)}
                >
                  <Users className="h-4 w-4" aria-hidden />
                  Log in
                </Link>
                <Link
                  href={registerHref}
                  className="relative mt-1 flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-xl py-2.5 text-sm font-bold text-white"
                  style={registerGoldButtonStyle}
                  onClick={() => setOpen(false)}
                >
                  <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
                  <UserRound className="relative z-10 h-4 w-4" aria-hidden />
                  <span className="relative z-10">Register</span>
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="mt-1 flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-sm font-bold text-navy"
                onClick={() => setOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Dashboard
              </Link>
            )}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
