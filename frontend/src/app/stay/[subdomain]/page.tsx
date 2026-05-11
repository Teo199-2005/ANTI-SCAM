import { ResortHeroSection } from "@/components/resort-page/ResortHeroSection";
import { ResortRoomsSection } from "@/components/resort-page/ResortRoomsSection";
import { ResortFooterSection } from "@/components/resort-page/ResortFooterSection";
import ResortPromoStrip from "@/components/resort-page/ResortPromoStrip";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { getPublicResortBySubdomain } from "@/lib/api/landingPage";
import Link from "next/link";
import type { Metadata } from "next";

type Props = { params: Promise<{ subdomain: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain } = await params;
  const result = await getPublicResortBySubdomain(subdomain);
  if (!result.ok) {
    return { title: "Resort | Anti-Scam PH" };
  }
  return { title: `${result.data.name} | Anti-Scam PH` };
}

export default async function StayLandingPage({ params }: Props) {
  const { subdomain } = await params;
  const result = await getPublicResortBySubdomain(subdomain);

  if (!result.ok && result.status === 404) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-navy">Resort not found</h1>
        <p className="mt-2 text-zinc-600">This subdomain is not linked to an active listing.</p>
        <Link href="/" className="mt-8 text-sky-700 underline">Back to home</Link>
      </div>
    );
  }

  if (!result.ok && result.status === 403) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-navy">Page unavailable</h1>
        <p className="mt-2 max-w-md text-zinc-600">
          This resort&apos;s subscription is not active. Please check back later or contact the property directly.
        </p>
        <Link href="/" className="mt-8 text-sky-700 underline">Back to home</Link>
      </div>
    );
  }

  if (!result.ok && result.status === 503) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-navy">Page coming soon</h1>
        <p className="mt-2 max-w-md text-zinc-600">
          This resort is still setting up their page. Check back shortly.
        </p>
        <Link href="/" className="mt-8 text-sky-700 underline">Back to home</Link>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-navy">Something went wrong</h1>
        <p className="mt-2 text-zinc-600">{result.message}</p>
        <Link href="/" className="mt-8 text-sky-700 underline">Back to home</Link>
      </div>
    );
  }

  const r = result.data;

  return (
    <main className="min-h-screen resort-light-pattern">
      <ResortHeroSection
        resortName={r.name}
        logoUrl={r.hero.logoUrl}
        bgPath={r.hero.bgImageUrl}
        heading={r.hero.heading}
        subheading={r.hero.subheading}
        ctaLabel="Explore rooms"
        ctaHref="#rooms"
      />

      {/* About section */}
      <section id="about" className="resort-light-pattern px-6 py-20">
        <ScrollReveal className="mx-auto max-w-5xl" direction="up">
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
          <h2 className="font-heading text-3xl font-bold text-navy sm:text-4xl">{r.about.heading}</h2>
          <div className="mt-4 h-px w-full bg-zinc-300/90" />
          {r.about.body ? (
            <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-zinc-600 sm:text-lg">
              {r.about.body}
            </p>
          ) : (
            <p className="mt-6 text-zinc-400">More details coming soon.</p>
          )}

          {/* Gallery images */}
          {r.gallery.length > 0 && (
            <div
              className={`mt-10 grid gap-4 ${
                r.gallery.length === 1
                  ? "grid-cols-1"
                  : r.gallery.length === 2
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {r.gallery.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="aspect-[4/3] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
          </div>
        </ScrollReveal>
      </section>

      <ResortPromoStrip />

      <ScrollReveal className="bg-transparent" direction="down">
        <ResortRoomsSection rooms={r.rooms} resortId={r.id} />
      </ScrollReveal>

      {/* Map section */}
      {r.map.embedUrl && (
        <section className="resort-light-pattern px-6 py-16">
          <ScrollReveal className="mx-auto max-w-5xl" direction="up">
            <div className="rounded-3xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/60 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
            <h2 className="mb-6 font-heading text-2xl font-bold text-navy">Find us here</h2>
            <div className="mb-6 h-px w-full bg-zinc-300/90" />
            {r.map.address && (
              <p className="mb-4 text-sm text-zinc-600">{r.map.address}</p>
            )}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
              <iframe
                src={r.map.embedUrl}
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Map for ${r.name}`}
              />
            </div>
            {r.map.searchUrl && (
              <a
                href={r.map.searchUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs text-sky-700 underline"
              >
                Open in Google Maps
              </a>
            )}
            </div>
          </ScrollReveal>
        </section>
      )}

      <ResortFooterSection footer={r.footer} resortName={r.name} />
    </main>
  );
}
