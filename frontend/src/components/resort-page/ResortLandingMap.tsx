import type { ResortLandingSurface } from "@/components/resort-page/resortLandingSurface";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { cn } from "@/lib/utils";
import type { LandingComputedMap } from "@/lib/api/landingPage";

type Props = {
  resortName: string;
  map: LandingComputedMap;
  surface: ResortLandingSurface;
};

export function ResortLandingMap({ resortName, map, surface }: Props) {
  if (!map.embedUrl) return null;

  const band = surface === "odd" ? "resort-landing-band-odd" : "resort-landing-band-even";
  const revealDir = surface === "odd" ? "down" : "up";

  return (
    <section id="map" className="scroll-mt-24 overflow-x-hidden border-t border-zinc-200/70">
      <div className={cn("pb-12 sm:pb-14 lg:pb-14", band)}>
        <div className="mx-auto w-full max-w-[min(1200px,100%)] px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="resort-landing-band-rule my-6 sm:my-8" aria-hidden />
        </div>
        <ScrollReveal
          className="resort-landing-container px-4 sm:px-6 md:px-8 lg:px-10"
          direction={revealDir}
          delayMs={55}
        >
          <p className="resort-landing-muted">Location</p>
          <h2 className="font-pop mt-1 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Find us</h2>
          {map.address ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">{map.address}</p>
          ) : null}
          <div className="mt-5 h-px max-w-lg bg-gradient-to-r from-zinc-400/65 via-zinc-200/90 to-transparent" />
          <div className="relative mt-6">
            <div className="rounded-2xl bg-gradient-to-br from-navy/20 via-zinc-200/90 to-zinc-400/70 p-[3px] shadow-[0_10px_40px_-8px_rgba(13,31,60,0.22),0_2px_8px_-2px_rgba(15,23,42,0.08)]">
              <div className="overflow-hidden rounded-[13px] border border-zinc-200/90 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                <iframe
                  src={map.embedUrl}
                  width="100%"
                  height="380"
                  className="block max-h-[min(52vh,26rem)] min-h-[260px] w-full lg:max-h-none lg:min-h-[380px]"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map for ${resortName}`}
                />
              </div>
            </div>
          </div>
          {map.searchUrl ? (
            <a
              href={map.searchUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-semibold text-zinc-700 underline-offset-2 hover:text-navy hover:underline"
            >
              Open in Google Maps
            </a>
          ) : null}
        </ScrollReveal>
      </div>
    </section>
  );
}
