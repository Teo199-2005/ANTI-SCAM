import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { ResortLandingHeroBackground } from "@/components/resort-page/ResortLandingHeroBackground";
import { laravelPublicUrl } from "@/lib/publicAsset";
import Link from "next/link";
import { Facebook, Instagram, ShieldCheck, Star } from "lucide-react";

/**
 * Public resort hero — full-bleed photo + glass panel.
 * - Desktop (`lg:`+): centered card and typography match the original large-screen design.
 * - Mobile (`max-lg:`): single-column flow, stronger legibility wash, full-width CTAs, larger tap targets.
 */

const GOLD = "#f5a623";
const REGISTER_GOLD_BACKGROUND = `linear-gradient(165deg, #ffd47a 0%, ${GOLD} 40%, #c9840f 100%)`;
const REGISTER_GOLD_SHINE_CORE =
  "relative isolate inline-flex items-center justify-center overflow-hidden text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_5px_14px_rgba(180,110,0,0.22)] transition [text-shadow:0_1px_0_rgba(0,0,0,0.12)] hover:brightness-[1.05] active:brightness-[0.98]";
const REGISTER_GOLD_SHINE_BASE = `${REGISTER_GOLD_SHINE_CORE} border border-amber-200/50`;
const REGISTER_GOLD_GLOSS_LAYER =
  "pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_0%,transparent_42%,rgba(255,255,255,0.22)_50%,transparent_58%,transparent_100%)] opacity-90";

const registerGoldButtonStyle = {
  background: REGISTER_GOLD_BACKGROUND,
  fontFamily: "var(--font-inter), system-ui, sans-serif",
} as const;

function safeHttpHref(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  );
}

type Props = {
  resortName: string;
  logoUrl: string | null;
  bgPath: string | null;
  heading: string;
  ctaLabel: string;
  ctaHref: string;
  isVip: boolean;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  /** Public tenant subdomain — enables subtle Register / Login links for guest accounts. */
  listingSlug?: string | null;
};

export function ResortLandingHero({
  resortName,
  logoUrl,
  bgPath,
  heading,
  ctaLabel,
  ctaHref,
  isVip,
  facebookUrl,
  instagramUrl,
  tiktokUrl,
  listingSlug,
}: Props) {
  const logoAbs = logoUrl ? laravelPublicUrl(logoUrl) : "";
  const fb = safeHttpHref(facebookUrl);
  const ig = safeHttpHref(instagramUrl);
  const tt = safeHttpHref(tiktokUrl);
  const hasSocials = Boolean(fb || ig || tt);

  return (
    <section
      id="top"
      className="relative isolate flex min-h-[min(78svh,44rem)] w-full flex-col overflow-x-hidden bg-zinc-900 max-lg:min-h-[min(85svh,46rem)] lg:min-h-[min(72svh,42rem)]"
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        <ResortLandingHeroBackground storagePath={bgPath} />
        {/* Barely-there edge vignette only — keeps photo readable; text uses glass panel below */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_100%,rgba(15,23,42,0.22),transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/55 via-transparent to-zinc-950/80 lg:hidden"
          aria-hidden
        />
      </div>

      {listingSlug ? (
        <div className="relative z-20 flex w-full justify-end px-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6 md:px-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href={`/register?resort=${encodeURIComponent(listingSlug)}`}
              className="rounded-full border border-white/25 bg-zinc-950/30 px-3 py-1.5 text-[11px] font-semibold text-white/95 shadow-sm backdrop-blur-md transition hover:bg-white/10 sm:text-xs"
            >
              Register
            </Link>
            <Link
              href={`/login?resort=${encodeURIComponent(listingSlug)}`}
              className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 backdrop-blur-md transition hover:bg-white/16 sm:text-xs"
            >
              Log in
            </Link>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex w-full flex-1 flex-col justify-end">
        <div className="resort-landing-container flex w-full justify-center px-[max(1rem,env(safe-area-inset-left))] pb-12 pe-[max(1rem,env(safe-area-inset-right))] pt-[max(1.25rem,env(safe-area-inset-top)+0.75rem)] max-lg:pb-28 sm:px-6 sm:pb-12 md:px-8 lg:px-10 lg:pb-10">
        <div className="relative mx-auto w-full max-w-[min(100%,26rem)] rounded-2xl border border-white/18 bg-zinc-950/30 p-5 pb-16 text-center shadow-[0_16px_48px_-12px_rgba(0,0,0,0.35)] backdrop-blur-2xl max-lg:px-4 max-lg:py-6 sm:max-w-[44rem] sm:border-white/22 sm:bg-zinc-950/35 sm:p-6 sm:pb-20">
          <div className="mb-5 flex max-w-xl flex-col items-center gap-3 sm:mb-4 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
            {logoAbs ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoAbs}
                alt=""
                className="h-[4.75rem] w-auto max-h-[6rem] max-w-[min(72vw,15rem)] shrink-0 rounded-lg object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.45)] drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] sm:h-[6.75rem] sm:max-h-[7.75rem] sm:max-w-[16rem] sm:rounded-xl"
              />
            ) : null}
            <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-2 sm:w-auto sm:max-w-none">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/12 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md sm:px-3.5 sm:py-2 sm:text-[11px]"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-zinc-300 sm:h-4 sm:w-4" aria-hidden />
              Verified listing
            </span>
            {isVip ? (
              <span
                className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-500/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:px-3.5 sm:py-2 sm:text-[11px]"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                <Star className="h-3.5 w-3.5 shrink-0 text-amber-200/90 sm:h-4 sm:w-4" aria-hidden />
                Featured partner
              </span>
            ) : null}
            </div>
          </div>

          <p
            className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300/95 sm:mb-0.5 sm:text-xs"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            {resortName}
          </p>

          <h1
            className="font-pop text-pretty text-[clamp(1.45rem,5.5vw+0.55rem,2.4rem)] font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] max-lg:mx-auto max-lg:max-w-[20rem] sm:max-w-none lg:mx-0 lg:max-w-none lg:text-[clamp(1.65rem,3.2vw+0.55rem,2.65rem)]"
          >
            {heading}
          </h1>

          <div className="mt-7 flex w-full max-w-md flex-col items-stretch gap-3 max-lg:mx-auto sm:mt-6 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-2.5">
            <Link
              href={ctaHref}
              className={`inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold sm:min-h-[44px] sm:w-auto sm:min-w-[168px] sm:px-7 sm:py-2.5 sm:text-[15px] ${REGISTER_GOLD_SHINE_BASE}`}
              style={registerGoldButtonStyle}
            >
              <span className={REGISTER_GOLD_GLOSS_LAYER} aria-hidden />
              <span className="relative z-10">{ctaLabel}</span>
            </Link>
            <a
              href="#info"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:border-white/28 hover:bg-white/16 sm:min-h-[44px] sm:w-auto sm:py-2.5"
            >
              Overview
            </a>
          </div>

          {hasSocials ? (
            <div
              className="mt-5 flex flex-wrap items-center justify-center gap-3 max-lg:gap-4 sm:mt-4 sm:gap-2.5"
              aria-label="Resort social links"
            >
              {fb ? (
                <a
                  href={fb}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${resortName} on Facebook`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/10 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition hover:border-white/26 hover:bg-white/16 hover:text-white sm:h-10 sm:w-10"
                >
                  <Facebook className="h-[18px] w-[18px]" aria-hidden />
                </a>
              ) : null}
              {ig ? (
                <a
                  href={ig}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${resortName} on Instagram`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/10 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition hover:border-white/26 hover:bg-white/16 hover:text-white sm:h-10 sm:w-10"
                >
                  <Instagram className="h-[18px] w-[18px]" aria-hidden />
                </a>
              ) : null}
              {tt ? (
                <a
                  href={tt}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${resortName} on TikTok`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/10 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition hover:border-white/26 hover:bg-white/16 hover:text-white sm:h-10 sm:w-10"
                >
                  <TikTokGlyph className="h-[18px] w-[18px]" />
                </a>
              ) : null}
            </div>
          ) : null}

          <div
            className="pointer-events-none absolute bottom-3 right-3 z-[1] flex max-w-[11rem] select-none flex-col items-end gap-0.5 text-right opacity-[0.34] sm:bottom-4 sm:right-4 sm:max-w-[13rem] sm:opacity-[0.38]"
            aria-hidden
          >
            <BrandWordmark tone="onDark" size="2xs" className="origin-bottom-right scale-[0.88] sm:scale-95" />
            <span
              className="max-w-[10rem] text-[9px] font-medium leading-snug text-white/55 sm:max-w-[12rem] sm:text-[10px]"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              Book with platform fee protection
            </span>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
