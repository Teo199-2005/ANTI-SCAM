import { ResortLandingFooter } from "@/components/resort-page/ResortLandingFooter";
import { ResortLandingHero } from "@/components/resort-page/ResortLandingHero";
import { ResortLandingMap } from "@/components/resort-page/ResortLandingMap";
import { ResortLandingMobileStickyNav } from "@/components/resort-page/ResortLandingMobileStickyNav";
import { ResortLandingOverview } from "@/components/resort-page/ResortLandingOverview";
import { ResortLandingStoryGallery } from "@/components/resort-page/ResortLandingStoryGallery";
import { ResortLandingTrustStrip } from "@/components/resort-page/ResortLandingTrustStrip";
import {
  resortLandingSectionChain,
  resortLandingSurfaceFor,
} from "@/components/resort-page/resortLandingSurface";
import { ResortRoomsSection } from "@/components/resort-page/ResortRoomsSection";
import type { PublicResortLandingPayload } from "@/lib/api/landingPage";

/**
 * Composes all public resort landing sections (`/resort/[slug]`).
 * - Desktop layout lives in each section’s `lg:` / `md:` rules (unchanged intent).
 * - Mobile-only chrome: bottom safe-area padding + `ResortLandingMobileStickyNav` (`lg:hidden`).
 */

type Props = {
  data: PublicResortLandingPayload;
};

export function ResortPublicLandingTemplate({ data }: Props) {
  const resortAmenities = Array.isArray(data.amenities) ? data.amenities : [];

  const hasAbout = Boolean(data.about.body?.trim());
  const hasRooms = data.rooms.length > 0;
  const hasMap = Boolean(data.map.embedUrl);
  const sectionChain = resortLandingSectionChain({ hasAbout, hasRooms, hasMap });

  return (
    <main className="resort-landing-shell max-lg:pb-28 lg:pb-0">
      <ResortLandingHero
        resortName={data.name}
        logoUrl={data.hero.logoUrl}
        bgPath={data.hero.bgImageUrl}
        heading={data.hero.heading}
        ctaLabel="Explore rooms"
        ctaHref="#rooms"
        isVip={data.isVip}
        facebookUrl={data.hero.facebookUrl ?? null}
        instagramUrl={data.hero.instagramUrl ?? null}
        tiktokUrl={data.hero.tiktokUrl ?? null}
      />

      <div className="w-full border-t border-white/10 border-b border-zinc-800/80 resort-landing-trust-strip-shell py-8 max-lg:py-9 sm:py-9">
        <div className="resort-landing-container px-4 sm:px-6 md:px-8 lg:px-10">
          <ResortLandingTrustStrip />
        </div>
      </div>

      {hasAbout ? (
        <ResortLandingStoryGallery about={data.about} surface={resortLandingSurfaceFor(sectionChain, "about")} />
      ) : null}

      <ResortRoomsSection
        rooms={data.rooms}
        resortId={data.id}
        surface={resortLandingSurfaceFor(sectionChain, "rooms")}
      />

      <ResortLandingOverview
        resortName={data.name}
        listingSlug={data.slug}
        logoUrl={data.logoUrl ?? data.hero.logoUrl}
        contactNumber={data.contactNumber}
        address={data.address}
        amenities={resortAmenities}
        cancellationPolicy={data.cancellationPolicy ?? null}
        surface={resortLandingSurfaceFor(sectionChain, "overview")}
        description={data.description ?? null}
        roomsCount={data.rooms.length}
        isVip={data.isVip}
        contactEmail={data.footer.contactEmail ?? null}
        mapSearchUrl={data.map.searchUrl ?? null}
      />

      <ResortLandingMap
        resortName={data.name}
        map={data.map}
        surface={resortLandingSurfaceFor(sectionChain, "map")}
      />

      <ResortLandingFooter footer={data.footer} resortName={data.name} />

      <ResortLandingMobileStickyNav showMapLink={hasMap} />
    </main>
  );
}
