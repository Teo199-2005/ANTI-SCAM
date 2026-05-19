"use client";

import { ResortGuestPublicFooter } from "@/components/auth/ResortGuestPublicFooter";
import { ResortLandingFooter } from "@/components/resort-page/ResortLandingFooter";
import { ResortPublicNavbar } from "@/components/resort-page/ResortPublicNavbar";
import { publicClient } from "@/lib/api/client";
import { getPublicResortBySubdomain, type PublicResortLandingPayload } from "@/lib/api/landingPage";
import { useEffect, useState } from "react";

type MinimalResortRow = {
  name: string;
  slug: string;
  logoUrl?: string | null;
};

type Props = {
  resortSlug: string;
  children: React.ReactNode;
};

/**
 * Resort landing chrome (navbar + footer) for guest login/register (`?resort=slug`).
 * Matches checkout shell so guests stay in the resort brand context.
 */
export function ResortGuestSlugChromeLayout({ resortSlug, children }: Readonly<Props>) {
  const slug = resortSlug.trim();
  const [loading, setLoading] = useState(true);
  const [landing, setLanding] = useState<PublicResortLandingPayload | null>(null);
  const [minimal, setMinimal] = useState<MinimalResortRow | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [landingResult, minimalRes] = await Promise.all([
          getPublicResortBySubdomain(slug),
          publicClient.get<{ success: boolean; data?: MinimalResortRow }>(
            `/public/resorts/slug/${encodeURIComponent(slug)}`,
          ),
        ]);
        if (cancelled) return;
        if (landingResult.ok) {
          setLanding(landingResult.data);
        } else {
          setLanding(null);
        }
        if (minimalRes.data.success && minimalRes.data.data?.name) {
          setMinimal(minimalRes.data.data);
        } else {
          setMinimal(null);
        }
      } catch {
        if (!cancelled) {
          setLanding(null);
          setMinimal(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
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
        <footer className="mt-auto border-t border-white/10 bg-[#0d1f3c] py-5 text-center text-[11px] font-medium text-[#b0bcd4]">
          Guest account · Anti-Scam PH
        </footer>
      </div>
    );
  }

  const listingSlug = (landing?.slug ?? minimal?.slug ?? slug).trim();
  const resortName = landing?.name ?? minimal?.name ?? "Resort";
  const logoUrl = landing
    ? (landing.logoUrl ?? landing.hero.logoUrl ?? null)
    : (minimal?.logoUrl ?? null);
  const landingHrefBase = listingSlug ? `/resort/${encodeURIComponent(listingSlug)}` : undefined;
  const hasAbout = Boolean(landing?.about.body?.trim());
  const hasMap = Boolean(landing?.map.embedUrl?.trim() || landing?.map.address?.trim());

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f4f7fb]">
      <ResortPublicNavbar
        resortName={resortName}
        logoUrl={logoUrl}
        listingSlug={listingSlug}
        hasAbout={hasAbout}
        hasMap={hasMap}
        landingHrefBase={landingHrefBase}
      />
      <main className="relative z-0 min-w-0 flex-1">{children}</main>
      {landing ? (
        <ResortLandingFooter
          footer={landing.footer}
          resortName={landing.name}
          isPremiumVerified={landing.isPremiumVerified ?? false}
        />
      ) : listingSlug ? (
        <ResortGuestPublicFooter resortSlug={listingSlug} />
      ) : null}
    </div>
  );
}
