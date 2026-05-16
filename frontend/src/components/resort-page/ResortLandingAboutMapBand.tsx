import { ResortLandingMap } from "@/components/resort-page/ResortLandingMap";
import { ResortLandingStoryGallery } from "@/components/resort-page/ResortLandingStoryGallery";
import { ResortLandingTrustStrip } from "@/components/resort-page/ResortLandingTrustStrip";
import type { ResortLandingSurface } from "@/components/resort-page/resortLandingSurface";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { cn } from "@/lib/utils";
import type { LandingComputedAbout, LandingComputedMap } from "@/lib/api/landingPage";

type Props = {
  resortName: string;
  about: LandingComputedAbout;
  amenities: string[];
  map: LandingComputedMap;
  showAbout: boolean;
  showMap: boolean;
  surface: ResortLandingSurface;
};

/**
 * Two-panel band: Anti-Scam trust + about (left), map embed (right) — mirrors hero + video split on `lg+`.
 */
export function ResortLandingAboutMapBand({
  resortName,
  about,
  amenities,
  map,
  showAbout,
  showMap,
  surface,
}: Props) {
  const band = surface === "odd" ? "resort-landing-band-odd" : "resort-landing-band-even";

  return (
    <section
      id="about"
      className={cn(
        "scroll-mt-24 border-t border-zinc-200/70",
        showMap
          ? "flex min-h-0 flex-col lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-0 lg:min-h-[min(32rem,520px)]"
          : "",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-col",
          band,
          showMap ? "max-lg:border-b max-lg:border-zinc-200/60" : "",
        )}
      >
        <ScrollReveal className="resort-landing-container flex flex-1 flex-col justify-center gap-8 px-4 py-10 sm:px-6 sm:py-12 md:px-8 lg:px-10 lg:py-14" direction="up" delayMs={40}>
          <ResortLandingTrustStrip variant="panel" />
          {showAbout ? (
            <>
              <div className="resort-landing-band-rule shrink-0" aria-hidden />
              <ResortLandingStoryGallery about={about} amenities={amenities} embedded />
            </>
          ) : null}
        </ScrollReveal>
      </div>

      {showMap ? (
        <div
          id="map"
          className="flex min-h-[min(52vw,20rem)] w-full shrink-0 flex-col scroll-mt-24 bg-gradient-to-br from-[#e8eaef] to-[#f4f4f5] p-3 sm:p-4 lg:min-h-0 lg:items-stretch lg:justify-center lg:p-5"
        >
          <ResortLandingMap resortName={resortName} map={map} embedded surface={surface} />
        </div>
      ) : null}
    </section>
  );
}
