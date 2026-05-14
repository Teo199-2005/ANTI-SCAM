import { ResortLandingFooter } from "@/components/resort-page/ResortLandingFooter";
import { ResortLandingHero } from "@/components/resort-page/ResortLandingHero";
import { ResortLandingMap } from "@/components/resort-page/ResortLandingMap";
import { ResortLandingStoryGallery } from "@/components/resort-page/ResortLandingStoryGallery";
import { ResortLandingTrustStrip } from "@/components/resort-page/ResortLandingTrustStrip";
import { ResortPublicNavbar } from "@/components/resort-page/ResortPublicNavbar";
import {
  resortLandingSectionChain,
  resortLandingSurfaceFor,
} from "@/components/resort-page/resortLandingSurface";
import { ResortRoomsSection } from "@/components/resort-page/ResortRoomsSection";
import type { PublicResortLandingPayload } from "@/lib/api/landingPage";
import { normalizeResortAmenities } from "@/lib/resortAmenities";

/**
 * Composes all public resort landing sections (`/resort/[slug]`).
 * - Desktop layout lives in each section’s `lg:` / `md:` rules (unchanged intent).
 * - Mobile: section links and auth live in `ResortPublicNavbar` (hamburger); no duplicate bottom bar.
 */

type Props = {
  data: PublicResortLandingPayload;
};

export function ResortPublicLandingTemplate({ data }: Props) {
  const adminEmbed = data.adminLandingEmbed ?? { enabled: false, youtubeVideoId: null };
  const resortAmenities = normalizeResortAmenities(data.amenities);

  const hasAbout = Boolean(data.about.body?.trim()) || resortAmenities.length > 0;
  const hasRooms = data.rooms.length > 0;
  const hasMap = Boolean(data.map.embedUrl);
  const sectionChain = resortLandingSectionChain({ hasAbout, hasRooms, hasMap });
  const heroSecondaryCta =
    hasAbout ? { href: "#about" as const, label: "About" } : hasMap ? { href: "#map" as const, label: "Find us" } : null;

  return (
    <main className="resort-landing-shell scroll-pt-[4.75rem] pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-0">
      <ResortPublicNavbar
        resortName={data.name}
        logoUrl={data.logoUrl ?? data.hero.logoUrl}
        listingSlug={data.slug}
        hasAbout={hasAbout}
        hasMap={hasMap}
      />
      <ResortLandingHero
        resortName={data.name}
        logoUrl={data.hero.logoUrl}
        bgPath={data.hero.bgImageUrl}
        heading={data.hero.heading}
        ctaLabel="Explore rooms"
        ctaHref="#rooms"
        secondaryCta={heroSecondaryCta}
        isVip={data.isVip}
        facebookUrl={data.hero.facebookUrl ?? null}
        instagramUrl={data.hero.instagramUrl ?? null}
        tiktokUrl={data.hero.tiktokUrl ?? null}
        adminEmbed={adminEmbed}
      />

      <ResortRoomsSection
        rooms={data.rooms}
        resortId={data.id}
        surface={resortLandingSurfaceFor(sectionChain, "rooms")}
      />

      <div className="w-full border-t border-zinc-200/50 border-b border-zinc-800/80 resort-landing-trust-strip-shell py-8 max-lg:py-9 sm:py-9">
        <div className="resort-landing-container px-4 sm:px-6 md:px-8 lg:px-10">
          <ResortLandingTrustStrip />
        </div>
      </div>

      {hasAbout ? (
        <ResortLandingStoryGallery
          about={data.about}
          amenities={resortAmenities}
          surface={resortLandingSurfaceFor(sectionChain, "about")}
        />
      ) : null}

      <ResortLandingMap
        resortName={data.name}
        map={data.map}
        surface={resortLandingSurfaceFor(sectionChain, "map")}
      />

      <ResortLandingFooter footer={data.footer} resortName={data.name} />
    </main>
  );
}
