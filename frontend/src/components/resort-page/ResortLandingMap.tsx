import type { ResortLandingSurface } from "@/components/resort-page/resortLandingSurface";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { cn } from "@/lib/utils";
import type { LandingComputedMap } from "@/lib/api/landingPage";
import { ExternalLink, MapPin } from "lucide-react";

const PANEL_NAVY = "#0d1f3c";
const PANEL_GOLD = "#f5a623";

type Props = {
  resortName: string;
  map: LandingComputedMap;
  surface?: ResortLandingSurface;
  /** Right column of `ResortLandingAboutMapBand` — full-height map panel (hero video style). */
  embedded?: boolean;
};

export function ResortLandingMap({ resortName, map, surface = "odd", embedded = false }: Props) {
  if (!map.embedUrl) return null;

  if (embedded) {
    return (
      <div
        className="flex h-full min-h-[min(52vw,20rem)] flex-1 flex-col overflow-hidden rounded-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] max-lg:rounded-b-2xl lg:min-h-0 lg:rounded-2xl lg:shadow-[0_12px_40px_-16px_rgba(13,31,60,0.45)]"
        style={{
          background: `linear-gradient(168deg, ${PANEL_NAVY} 0%, #132b52 48%, #1a3a5c 100%)`,
        }}
      >
        <header className="shrink-0 border-b border-white/[0.08] bg-white/[0.04] px-4 py-3.5 backdrop-blur-sm sm:px-5 sm:py-4">
          <p
            className="font-pop text-[10px] font-bold uppercase tracking-[0.16em] sm:text-[11px]"
            style={{ color: PANEL_GOLD }}
          >
            Location
          </p>
          <h2 className="font-pop mt-1 text-lg font-extrabold tracking-tight text-white/95 sm:text-xl">Find us</h2>
          {map.address ? (
            <p
              className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-[#b8c4dc] sm:text-sm"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
              <span>{map.address}</span>
            </p>
          ) : null}
        </header>

        <div className="relative flex min-h-[12rem] flex-1 flex-col p-3 sm:p-4 lg:min-h-0">
          <div className="relative flex min-h-[10rem] flex-1 overflow-hidden rounded-xl ring-1 ring-white/12 sm:rounded-2xl sm:ring-white/15">
            <div
              className="pointer-events-none absolute inset-0 z-[1] rounded-xl sm:rounded-2xl"
              style={{ boxShadow: "inset 0 0 24px rgba(13, 31, 60, 0.35)" }}
              aria-hidden
            />
            <iframe
              src={map.embedUrl}
              className="absolute inset-0 h-full w-full rounded-xl border-0 sm:rounded-2xl"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map for ${resortName}`}
            />
          </div>
        </div>

        {map.searchUrl ? (
          <footer className="shrink-0 border-t border-white/[0.08] bg-white/[0.03] px-4 py-3 sm:px-5">
            <a
              href={map.searchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200/95 underline-offset-2 transition hover:text-amber-100 hover:underline sm:text-sm"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              Open in Google Maps
            </a>
          </footer>
        ) : null}
      </div>
    );
  }

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
