import type { ResortLandingSurface } from "@/components/resort-page/resortLandingSurface";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { cn } from "@/lib/utils";
import type { LandingComputedAbout } from "@/lib/api/landingPage";
import { Sparkles } from "lucide-react";

/** About copy + resort-wide amenities — desktop uses full `max-w-3xl`; narrow screens tighten line measure (`max-lg:`). */
type Props = {
  about: LandingComputedAbout;
  /** Resort profile amenities (comma-separated on save; normalized before pass-in). */
  amenities: string[];
  surface: ResortLandingSurface;
};

export function ResortLandingStoryGallery({ about, amenities, surface }: Props) {
  const body = about.body?.trim() ?? "";
  const hasBody = Boolean(body);
  const hasAmenities = amenities.length > 0;

  if (!hasBody && !hasAmenities) {
    return null;
  }

  const band = surface === "odd" ? "resort-landing-band-odd" : "resort-landing-band-even";

  return (
    <section id="about" className={cn("resort-landing-section scroll-mt-24 border-t border-zinc-200/70", band)}>
      <ScrollReveal className="resort-landing-container" direction="up" delayMs={40}>
        <p className="resort-landing-muted">About the property</p>
        <div className="mt-3 max-w-3xl">
          <h2 className="font-pop text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">{about.heading}</h2>
          <div className="mt-4 h-px max-w-xs bg-gradient-to-r from-zinc-400/80 to-transparent" />
          {hasBody ? (
            <p className="mt-6 whitespace-pre-line text-pretty text-sm leading-relaxed text-zinc-600 max-lg:max-w-[min(100%,22rem)] sm:text-base lg:max-w-none">
              {body}
            </p>
          ) : null}

          {hasAmenities ? (
            <div className={cn(hasBody ? "mt-8" : "mt-6")}>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/90 bg-zinc-50/90 text-zinc-500 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.65]"
                  aria-hidden
                >
                  <Sparkles />
                </span>
                <h3 className="font-heading text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Resort amenities
                </h3>
              </div>
              <p className="mt-1.5 max-w-xl text-pretty text-xs leading-snug text-zinc-500 sm:text-sm">
                Listed by the resort for all guests.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {amenities.map((label) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm sm:text-[13px]"
                  >
                    <Sparkles className="h-3 w-3 shrink-0 text-zinc-400" strokeWidth={2} aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </ScrollReveal>
    </section>
  );
}
