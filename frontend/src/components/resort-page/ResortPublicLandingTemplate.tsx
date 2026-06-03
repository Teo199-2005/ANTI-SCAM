import { ResortLandingAboutMapBand } from "@/components/resort-page/ResortLandingAboutMapBand";
import { ResortLandingFooter } from "@/components/resort-page/ResortLandingFooter";
import { ResortLandingHero } from "@/components/resort-page/ResortLandingHero";
import { ResortPublicNavbar } from "@/components/resort-page/ResortPublicNavbar";
import { ResortReviewsSection } from "@/components/resort-page/ResortReviewsSection";
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
  const sectionChain = resortLandingSectionChain({ hasAbout: true, hasRooms, hasMap: false, hasReviews: true });

  return (
    <main className="resort-landing-shell scroll-pt-[4.75rem] pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-0">
      {/* Expose resort ID for visitor tracking (fire-and-forget analytics) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__ASP_RESORT_ID__=${data.id};`,
        }}
      />
      <ResortPublicNavbar
        resortName={data.name}
        logoUrl={data.logoUrl ?? data.hero.logoUrl}
        listingSlug={data.slug}
        hasAbout
        hasMap={hasMap}
      />
      <ResortLandingHero
        resortName={data.name}
        logoUrl={data.hero.logoUrl}
        bgPath={data.hero.bgImageUrl}
        heading={data.hero.heading}
        location={data.address ?? data.map.address}
        contactNumber={data.contactNumber}
        isVip={data.isVip}
        isPremiumVerified={data.isPremiumVerified ?? false}
        verificationStatus={data.verificationStatus}
        averageRating={data.averageRating}
        totalReviews={data.totalReviews}
        badgeLabel={data.badgeLabel}
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

      <ResortReviewsSection
        resortId={data.id}
        surface={resortLandingSurfaceFor(sectionChain, "reviews")}
      />

      <ResortLandingAboutMapBand
        resortName={data.name}
        about={data.about}
        amenities={resortAmenities}
        map={data.map}
        showAbout={hasAbout}
        showMap={hasMap}
        surface={resortLandingSurfaceFor(sectionChain, "about")}
      />

      <ResortLandingFooter
        footer={data.footer}
        resortName={data.name}
        isPremiumVerified={data.isPremiumVerified ?? false}
      />
    </main>
  );
}
