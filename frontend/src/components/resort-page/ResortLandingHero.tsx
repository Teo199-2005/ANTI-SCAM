import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { ResortHeroAdminEmbedPanel } from "@/components/resort-page/ResortHeroAdminEmbedPanel";
import { ResortLandingHeroBackground } from "@/components/resort-page/ResortLandingHeroBackground";
import { laravelPublicUrl } from "@/lib/publicAsset";
import type { PublicAdminLandingEmbed } from "@/lib/api/landingPage";
import { cn } from "@/lib/utils";
import { Facebook, Instagram, MapPin, Phone, ShieldCheck, Star } from "lucide-react";

/**
 * Public resort hero — full-bleed photo + glass panel.
 * With an admin intro video (`adminLandingEmbed.enabled` + valid `youtubeVideoId`), `lg+` uses a two-column row (no max-height cap) so the glass card and video panel are not clipped.
 * Mobile stacks the video panel under the hero card.
 */

function telHref(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return `tel:+${digits.startsWith("63") ? digits : `63${digits.replace(/^0/, "")}`}`;
}

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
  /** Resort address / location label for the hero. */
  location?: string | null;
  contactNumber?: string | null;
  /** Optional hero link (e.g. About / Find us) — no default when omitted. */
  secondaryCta?: { href: string; label: string } | null;
  isVip: boolean;
  badgeLabel?: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  /** Admin-configured intro video — second hero column on large screens when enabled. */
  adminEmbed?: PublicAdminLandingEmbed | null;
};

export function ResortLandingHero({
  resortName,
  logoUrl,
  bgPath,
  heading,
  location,
  contactNumber,
  secondaryCta,
  isVip,
  badgeLabel,
  facebookUrl,
  instagramUrl,
  tiktokUrl,
  adminEmbed,
}: Props) {
  const logoAbs = logoUrl ? laravelPublicUrl(logoUrl) : "";
  const fb = safeHttpHref(facebookUrl);
  const ig = safeHttpHref(instagramUrl);
  const tt = safeHttpHref(tiktokUrl);
  const hasSocials = Boolean(fb || ig || tt);
  const locationLabel = location?.trim() || null;
  const phoneLabel = contactNumber?.trim() || null;
  const phoneLink = telHref(phoneLabel);
  const hasContact = Boolean(locationLabel || phoneLabel);
  const showContactRow = hasContact || hasSocials;

  const socialLinkClass =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/10 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition hover:border-white/26 hover:bg-white/16 hover:text-white";

  /** Public API only sets `enabled` when a valid YouTube id exists — both must be true to show the embed column. */
  const showVideoPanel = Boolean(adminEmbed?.enabled && adminEmbed?.youtubeVideoId);

  return (
    <section
      id="top"
      className={cn(
        "relative isolate w-full overflow-x-hidden overflow-y-visible bg-zinc-900",
        showVideoPanel
          ? "flex min-h-0 flex-col lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-0 lg:min-h-[min(46svh,26rem)]"
          : "flex min-h-[min(40svh,20rem)] flex-col max-lg:min-h-[min(44svh,22rem)] lg:min-h-[min(36svh,19rem)]",
      )}
    >
      {/* Left: photo + glass card — split with embed: no max-height so the panel is not clipped */}
      <div
        className={cn(
          "relative flex min-h-0 flex-col justify-end overflow-visible",
          showVideoPanel
            ? "min-h-[min(40svh,20rem)] max-lg:flex-1 max-lg:min-h-[min(42svh,21rem)] lg:min-h-0"
            : "min-h-[min(40svh,20rem)] flex-1 max-lg:min-h-[min(44svh,22rem)] lg:min-h-[min(36svh,19rem)]",
        )}
      >
        <div className="absolute inset-0 z-0 overflow-hidden">
          <ResortLandingHeroBackground storagePath={bgPath} />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_100%,rgba(15,23,42,0.22),transparent_55%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/55 via-transparent to-zinc-950/80 lg:hidden"
            aria-hidden
          />
        </div>

        <div className="relative z-10 flex w-full flex-1 flex-col justify-end overflow-visible">
          <div className="resort-landing-container flex w-full justify-center px-[max(1rem,env(safe-area-inset-left))] pb-8 pe-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top)+0.5rem)] max-lg:pb-16 sm:px-6 sm:pb-8 md:px-8 lg:px-10 lg:pb-8">
            <div className="relative mx-auto w-full max-w-[min(100%,26rem)] overflow-visible rounded-2xl border border-white/18 bg-zinc-950/30 p-4 pb-12 text-center shadow-[0_16px_48px_-12px_rgba(0,0,0,0.35)] backdrop-blur-2xl max-lg:px-4 max-lg:py-5 sm:max-w-[44rem] sm:border-white/22 sm:bg-zinc-950/35 sm:p-5 sm:pb-14">
              <div className="mb-4 flex max-w-xl flex-col items-center gap-3 sm:mb-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
                {logoAbs ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoAbs}
                    alt=""
                    className="h-[4rem] w-auto max-h-[5.25rem] max-w-[min(72vw,14rem)] shrink-0 rounded-lg object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.45)] drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] sm:h-[5.5rem] sm:max-h-[6.5rem] sm:max-w-[15rem] sm:rounded-xl"
                  />
                ) : null}
                <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-2 sm:w-auto sm:max-w-none">
                  <span
                    className={
                      isVip
                        ? "inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:px-3.5 sm:py-2 sm:text-[11px]"
                        : "inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md sm:px-3.5 sm:py-2 sm:text-[11px]"
                    }
                    style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                  >
                    {isVip ? (
                      <Star className="h-3.5 w-3.5 shrink-0 text-amber-200/90 sm:h-4 sm:w-4" aria-hidden />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-zinc-300 sm:h-4 sm:w-4" aria-hidden />
                    )}
                    {badgeLabel ?? (isVip ? "Premium Verified Resort" : "Verified Resort")}
                  </span>
                </div>
              </div>

              <p
                className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300/95 sm:text-xs"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                {resortName}
              </p>

              <h1
                className="font-pop text-pretty text-[clamp(1.35rem,5vw+0.45rem,2.15rem)] font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] max-lg:mx-auto max-lg:max-w-[20rem] sm:max-w-none lg:mx-0 lg:max-w-none lg:text-[clamp(1.45rem,2.6vw+0.5rem,2.35rem)]"
              >
                {heading}
              </h1>

              {showContactRow ? (
                <div
                  className="mx-auto mt-5 flex w-full max-w-xl flex-row flex-wrap items-center justify-center gap-x-4 gap-y-2.5 sm:mt-4 sm:justify-evenly sm:gap-x-2 sm:px-1"
                  aria-label="Resort contact and social links"
                >
                  {locationLabel ? (
                    <p className="inline-flex shrink-0 items-center justify-center gap-1.5 text-xs leading-snug text-zinc-100/95 sm:gap-2 sm:text-sm">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-200/90 sm:h-4 sm:w-4" aria-hidden />
                      <span className="text-pretty">{locationLabel}</span>
                    </p>
                  ) : null}
                  {locationLabel && phoneLabel ? (
                    <span className="hidden h-3.5 w-px shrink-0 bg-white/25 sm:block sm:h-4" aria-hidden />
                  ) : null}
                  {phoneLabel ? (
                    phoneLink ? (
                      <a
                        href={phoneLink}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 text-xs font-semibold text-zinc-100 transition hover:text-white sm:gap-2 sm:text-sm"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0 text-amber-200/90 sm:h-4 sm:w-4" aria-hidden />
                        <span className="whitespace-nowrap">{phoneLabel}</span>
                      </a>
                    ) : (
                      <p className="inline-flex shrink-0 items-center justify-center gap-1.5 text-xs font-semibold text-zinc-100/95 sm:gap-2 sm:text-sm">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-amber-200/90 sm:h-4 sm:w-4" aria-hidden />
                        <span className="whitespace-nowrap">{phoneLabel}</span>
                      </p>
                    )
                  ) : null}
                  {hasContact && hasSocials ? (
                    <span className="hidden h-3.5 w-px shrink-0 bg-white/25 sm:block sm:h-4" aria-hidden />
                  ) : null}
                  {hasSocials ? (
                    <div className="flex shrink-0 items-center justify-center gap-1.5 sm:gap-2">
                      {fb ? (
                        <a
                          href={fb}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${resortName} on Facebook`}
                          className={socialLinkClass}
                        >
                          <Facebook className="h-4 w-4" aria-hidden />
                        </a>
                      ) : null}
                      {ig ? (
                        <a
                          href={ig}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${resortName} on Instagram`}
                          className={socialLinkClass}
                        >
                          <Instagram className="h-4 w-4" aria-hidden />
                        </a>
                      ) : null}
                      {tt ? (
                        <a
                          href={tt}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${resortName} on TikTok`}
                          className={socialLinkClass}
                        >
                          <TikTokGlyph className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {secondaryCta ? (
                <div className="mt-4 flex justify-center sm:mt-3">
                  <a
                    href={secondaryCta.href}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:border-white/28 hover:bg-white/16 sm:min-h-[42px]"
                  >
                    {secondaryCta.label}
                  </a>
                </div>
              ) : null}

              <div
                className="pointer-events-none absolute bottom-2.5 right-2.5 z-[1] flex max-w-[10rem] select-none flex-col items-end gap-0.5 text-right opacity-[0.34] sm:bottom-3 sm:right-3 sm:max-w-[12rem] sm:opacity-[0.38]"
                aria-hidden
              >
                <BrandWordmark tone="onDark" size="2xs" className="origin-bottom-right scale-[0.85] sm:scale-90" />
                <span
                  className="max-w-[9rem] text-[8px] font-medium leading-snug text-white/55 sm:max-w-[11rem] sm:text-[9px]"
                  style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                >
                  Book with platform fee protection
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showVideoPanel && adminEmbed ? (
        <div className="relative flex min-h-[min(52vw,17rem)] w-full shrink-0 flex-col border-t border-white/10 lg:min-h-0 lg:border-l lg:border-t-0">
          <ResortHeroAdminEmbedPanel embed={adminEmbed} />
        </div>
      ) : null}
    </section>
  );
}
