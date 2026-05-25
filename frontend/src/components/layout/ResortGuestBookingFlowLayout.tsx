"use client";

import { ResortGuestPublicFooter } from "@/components/auth/ResortGuestPublicFooter";
import { BrandWordmark } from "@/components/branding/BrandWordmark";
import Footer from "@/components/layout/Footer";
import { MarketingPremiumNavbar } from "@/components/layout/MarketingPremiumNavbar";
import { ResortLandingFooter } from "@/components/resort-page/ResortLandingFooter";
import { ResortPublicNavbar } from "@/components/resort-page/ResortPublicNavbar";
import { getPublicResortBySubdomain, type PublicResortLandingPayload } from "@/lib/api/landingPage";
import { getReservation } from "@/lib/api/payment";
import type { PublicResort } from "@/lib/api/public";
import { getPublicResort } from "@/lib/api/public";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/badges/VerifiedBadge";
import { ExternalLink, Globe, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const FOOTER_NAVY = "#0d1f3c";
const FOOTER_GOLD = "#f5a623";

const footerGlass =
  "flex min-h-0 flex-col rounded-2xl border border-white/15 bg-white/[0.06] p-5 shadow-inner backdrop-blur-sm";

const footerInter = { fontFamily: "var(--font-inter), system-ui, sans-serif" } as const;

function BookingFlowLoadingChrome({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f4f7fb]">
      <header
        className="sticky top-0 z-[100] border-b border-zinc-200/85 bg-white/95 pt-[max(0.35rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-xl"
        role="banner"
      >
        <div className="resort-landing-container px-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] py-3 text-sm text-zinc-500">
          <span className="inline-flex items-center gap-2">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-navy"
              aria-hidden
            />
            Loading resort…
          </span>
        </div>
      </header>
      <main className="relative z-0 min-w-0 flex-1">{children}</main>
      <footer
        className="mt-auto border-t border-white/10 py-5 text-center text-[11px] font-medium text-[#b0bcd4]"
        style={{ backgroundColor: FOOTER_NAVY }}
      >
        Secure checkout · Anti-Scam PH
      </footer>
    </div>
  );
}

/**
 * When the full landing payload is unavailable but we still have public resort data (no subdomain
 * on tenant). Matches the navy / gold resort landing footer system instead of a flat gray strip.
 */
function PublicResortShellFooter({ resort }: Readonly<{ resort: PublicResort }>) {
  const year = new Date().getFullYear();
  const tel = resort.contactNumber?.replace(/\s+/g, "");
  const logoAbs = resort.logoUrl ? laravelPublicUrl(resort.logoUrl) : "";

  return (
    <footer className="mt-auto border-t border-zinc-200/90 text-zinc-800">
      <section className="border-t-2 border-white/20" style={{ backgroundColor: FOOTER_NAVY }} aria-label="Resort and platform">
        <div className="resort-landing-container py-10 sm:py-12 md:px-8 lg:px-10">
          <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/"
              aria-label="Anti-Scam PH home"
              className="inline-flex max-w-full min-w-0 items-center gap-3 rounded-lg outline-none ring-white/0 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-amber-300/90"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 p-1.5 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/branding/mainlogo.png"
                  alt=""
                  width={36}
                  height={36}
                  className="h-8 w-8 object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <BrandWordmark tone="onDark" size="sm" className="min-w-0 leading-tight" />
            </Link>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/90">
              <VerifiedBadge
                premium={Boolean(resort.isPremiumVerified)}
                size="sm"
                standardIconClassName="h-3.5 w-3.5 text-zinc-200"
              />
              Verified booking checkout
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            <div className={footerGlass}>
              <p className="mb-3 font-pop text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: FOOTER_GOLD }}>
                This resort
              </p>
              <div className="flex items-start gap-3">
                {logoAbs ? (
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/10 p-0.5 shadow-inner">
                    <Image
                      src={logoAbs}
                      alt=""
                      fill
                      className="object-contain p-1"
                      sizes="48px"
                      unoptimized
                    />
                  </span>
                ) : null}
                <div className="min-w-0">
                  <p className="font-heading text-base font-semibold text-white">{resort.name}</p>
                  {resort.address ? (
                    <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-[#b0bcd4]" style={footerInter}>
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
                      {resort.address}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-[#8899b8]" style={footerInter}>
                      Location is managed in the resort profile.
                    </p>
                  )}
                  {tel && resort.contactNumber ? (
                    <p className="mt-3 text-sm" style={footerInter}>
                      <a
                        href={`tel:${tel}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-amber-200/95 underline-offset-2 hover:text-amber-100 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                        {resort.contactNumber}
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={cn(footerGlass, "justify-between gap-4")}>
              <div>
                <p className="mb-3 font-pop text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: FOOTER_GOLD }}>
                  Platform
                </p>
                <p className="text-sm leading-relaxed text-[#b0bcd4]" style={footerInter}>
                  Secure reservations and guest protection are{" "}
                  <span className="font-semibold text-white/95">powered by Anti-Scam PH</span>.{" "}
                  <Link href="/contact" className="font-semibold text-amber-200/95 underline-offset-2 hover:underline">
                    Contact support
                  </Link>
                  .
                </p>
                <ul className="mt-4 space-y-2.5 text-sm font-semibold text-white/90" style={footerInter}>
                  <li>
                    <Link href="/" className="inline-flex items-center gap-2 transition hover:text-amber-200">
                      <Globe className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      Anti-Scam PH home
                    </Link>
                  </li>
                  <li>
                    <Link href="/resorts" className="inline-flex items-center gap-2 transition hover:text-amber-200">
                      <ExternalLink className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      Browse resorts
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <p
            className="mt-10 border-t border-white/10 pt-6 text-center text-[11px] font-medium text-[#8899b8]"
            style={footerInter}
          >
            © {year} {resort.name}. Anti-Scam PH · Platform v{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0"}
          </p>
        </div>
      </section>
    </footer>
  );
}
export function ResortGuestBookingFlowLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const reservationId = searchParams.get("reservation_id");

  const [loading, setLoading] = useState(true);
  const [publicResort, setPublicResort] = useState<PublicResort | null>(null);
  const [landing, setLanding] = useState<PublicResortLandingPayload | null>(null);
  /** True when we cannot resolve a resort (e.g. payment page missing reservation_id, or public API error). */
  const [shellFailed, setShellFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPublicResort(null);
    setLanding(null);
    setShellFailed(false);

    void (async () => {
      let resortIdNum: number | null = null;
      const pathMatch = pathname?.match(/^\/resorts\/([^/]+)\/(checkout|confirmation)$/);
      if (pathMatch?.[1]) {
        const n = Number(pathMatch[1]);
        if (Number.isFinite(n) && n > 0) resortIdNum = n;
      } else if (pathname === "/payment/success" || pathname === "/payment/failed") {
        if (!reservationId) {
          if (!cancelled) {
            setShellFailed(true);
            setLoading(false);
          }
          return;
        }
        try {
          const r = await getReservation(Number(reservationId));
          resortIdNum = r.resortId;
        } catch {
          if (!cancelled) {
            setShellFailed(true);
            setLoading(false);
          }
          return;
        }
      }

      if (!resortIdNum) {
        if (!cancelled) {
          setShellFailed(true);
          setLoading(false);
        }
        return;
      }

      try {
        const pr = await getPublicResort(resortIdNum);
        if (cancelled) return;
        setPublicResort(pr);

        const slug = pr.slug?.trim();
        if (slug) {
          const result = await getPublicResortBySubdomain(slug);
          if (cancelled) return;
          if (result.ok) {
            setLanding(result.data);
          }
        }
      } catch {
        if (!cancelled) {
          setPublicResort(null);
          setShellFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, reservationId]);

  if (shellFailed) {
    return (
      <div className="flex min-h-screen flex-col overflow-x-hidden">
        <MarketingPremiumNavbar mode="marketing-solid" />
        <main className="relative z-0 min-w-0 flex-1">{children}</main>
        <Footer />
      </div>
    );
  }

  if (loading || !publicResort) {
    return <BookingFlowLoadingChrome>{children}</BookingFlowLoadingChrome>;
  }

  const slug = (landing?.slug ?? publicResort.slug)?.trim() ?? "";
  const resortName = landing?.name ?? publicResort.name;
  const logoUrl = landing
    ? (landing.logoUrl ?? landing.hero.logoUrl ?? null)
    : (publicResort.logoUrl ?? publicResort.images?.[0]?.url ?? null);
  const landingHrefBase = slug ? `/resort/${encodeURIComponent(slug)}` : undefined;
  const hasAbout = Boolean(landing?.about.body?.trim());
  const hasMap = Boolean(landing?.map.embedUrl?.trim() || landing?.map.address?.trim());

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f4f7fb]">
      <ResortPublicNavbar
        resortName={resortName}
        logoUrl={logoUrl}
        listingSlug={slug}
        hasAbout={hasAbout}
        hasMap={hasMap}
        landingHrefBase={landingHrefBase}
        showDashboardLink={Boolean(user)}
      />
      <main className="relative z-0 min-w-0 flex-1">{children}</main>
      {landing ? (
        <ResortLandingFooter
          footer={landing.footer}
          resortName={landing.name}
          isPremiumVerified={landing.isPremiumVerified ?? false}
        />
      ) : slug ? (
        <ResortGuestPublicFooter resortSlug={slug} />
      ) : (
        <PublicResortShellFooter resort={publicResort} />
      )}
    </div>
  );
}
