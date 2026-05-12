import type { ResortLandingSurface } from "@/components/resort-page/resortLandingSurface";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { cn } from "@/lib/utils";
import type { LandingComputedAbout } from "@/lib/api/landingPage";

/** About copy block — desktop uses full `max-w-3xl`; narrow screens tighten line measure (`max-lg:`). */
type Props = {
  about: LandingComputedAbout;
  surface: ResortLandingSurface;
};

export function ResortLandingStoryGallery({ about, surface }: Props) {
  const body = about.body?.trim() ?? "";

  if (!body) {
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
          <p className="mt-6 whitespace-pre-line text-pretty text-sm leading-relaxed text-zinc-600 max-lg:max-w-[min(100%,22rem)] sm:text-base lg:max-w-none">
            {body}
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}
