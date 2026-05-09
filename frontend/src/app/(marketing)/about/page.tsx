import PageContainer from "@/components/layout/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";
import VisionariesSection from "@/components/home/VisionariesSection";
import Image from "next/image";
import {
  BadgeCheck,
  Flag,
  Gem,
  type LucideProps,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type { FC } from "react";

function SectionDivider({ icon: Icon }: { icon: FC<LucideProps> }) {
  return (
    <div className="flex items-center gap-4 py-1" aria-hidden="true">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-clSeafoam to-clSeafoam/30" />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-clSeafoam bg-white shadow-sm">
        <Icon size={13} className="text-clTeal" />
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-clSeafoam to-clSeafoam/30" />
    </div>
  );
}

const platformHighlights = [
  "Smart reservation systems",
  "Real-time booking management",
  "Double-booking prevention",
  "Dedicated booking websites",
  "Monthly financial reports",
  "Verified resort protection",
  "Automated inquiry handling",
];

const pillars = [
  {
    icon: Target,
    title: "Our mission",
    description:
      "To give Philippine resorts a trusted, modern reservation ecosystem through secure booking technology, operational automation, and verified resort protection — helping businesses grow while guests book with confidence nationwide.",
  },
  {
    icon: Flag,
    title: "Our vision",
    description:
      "To lead as the Philippines’ verified resort network and reservation management platform — setting the standard for trusted bookings, professional operations, and scam-free hospitality.",
  },
  {
    icon: Lightbulb,
    title: "Why we built Anti-Scam PH",
    description:
      "Fake resort pages, booking scams, reservation conflicts, and manual workflows were costing legitimate operators and guests alike. We built Anti-Scam PH so serious resorts can grow professionally online — and guests can reserve with clearer trust and security.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* ── Visionaries hero band ──────────────────────────────────── */}
      <div className="border-b border-clSeafoam/50 bg-gradient-to-b from-clSand/70 via-white to-white">
        <VisionariesSection />
      </div>

      <PageContainer className="section-padding space-y-10">

        {/* ── About Us ──────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-3xl border border-clSeafoam/70 bg-gradient-to-br from-white via-clSand/20 to-clSeafoam/30 shadow-cl-card">
          <div className="grid md:grid-cols-[1.6fr_1fr]">
            {/* Left — brand narrative */}
            <div className="p-7 md:border-r md:border-clSeafoam/50 md:p-10">
              <span className="cl-section-eyebrow mb-4 inline-flex">About us</span>
              <SectionHeading
                title="Anti-Scam PH"
                subtitle="Philippine-based resort verification and reservation management — built for trust, automation, and growth."
              />
              <div className="max-w-2xl space-y-4 text-base leading-8 text-zinc-600">
                <p>
                  <strong className="font-semibold text-zinc-800">Anti-Scam PH</strong> is a
                  Philippine-based resort verification and reservation management platform operated by{" "}
                  <strong className="font-semibold text-zinc-800">The Rising 2 Brothers OPC</strong>,
                  established in 2024.
                </p>
                <p>
                  We help modernize the resort and staycation industry with secure booking, verified
                  listings, and smart tools for owners nationwide — so legitimate businesses can compete
                  on service, not on who shouts loudest online.
                </p>
                <p>
                  We know the pain points: fake booking pages, scams, double bookings, endless
                  inquiries, and spreadsheets that don&apos;t scale. Through verification, automation,
                  and clear guest communication, we aim for a safer, more organized, and more
                  professional booking experience across the country.
                </p>
              </div>

              <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-clOcean">
                What we help resorts streamline
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {platformHighlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-xl border border-clSeafoam/70 bg-white/70 px-3 py-2.5 text-sm text-zinc-700 shadow-sm"
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-clTeal" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-sm leading-7 text-zinc-600">
                Our verification approach helps guests spot legitimate resorts and helps owners build
                credibility. As we grow, we&apos;re working toward a trusted nationwide network of
                verified properties — and a stronger, more modern Philippine hospitality sector.
              </p>
            </div>

            {/* Right — two info cards */}
            <div className="flex flex-col divide-y divide-clSeafoam/50">
              <div className="flex flex-col justify-center bg-clSeafoam/25 p-6 md:p-8">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="inline-flex rounded-xl border border-clOcean/20 bg-white p-2 shadow-sm text-clOcean">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-clOcean">
                    Verification & trust
                  </p>
                </div>
                <p className="text-sm leading-7 text-zinc-600">
                  We combine technology with verification signals so guests can book with clearer
                  confidence — and owners can stand out as verified, professional operators.
                </p>
              </div>
              <div className="flex flex-col justify-center bg-white/50 p-6 md:p-8">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="inline-flex rounded-xl border border-primaryBlue/20 bg-white p-2 shadow-sm">
                    <BadgeCheck className="h-4 w-4 text-primaryBlue" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-clOcean">
                    One platform
                  </p>
                </div>
                <p className="text-sm leading-7 text-zinc-600">
                  Listings, reservations, availability, payments, and reporting in one place — fewer
                  tools, fewer mistakes, more time for guests.
                </p>
              </div>
            </div>
          </div>
        </section>

        <SectionDivider icon={Target} />

        {/* ── Mission / Vision / Why we built ─────────────────────────── */}
        <section className="overflow-hidden rounded-3xl border border-clSeafoam/60 bg-white shadow-cl-card">
          <div className="p-7 md:p-10">
            <span className="cl-section-eyebrow mb-4 inline-flex">Direction</span>
            <SectionHeading
              title="Mission, vision & purpose"
              subtitle="What drives Anti-Scam PH — and why we keep building for Philippine resorts and their guests."
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {pillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 transition-colors duration-200 hover:border-zinc-300 hover:bg-white"
                >
                  <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm">
                    <pillar.icon size={16} />
                  </div>
                  <h3 className="mt-3 font-heading text-xl text-clOcean">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-600">{pillar.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <SectionDivider icon={Gem} />

        {/* ── Brand Poster (full-width) ───────────────────────────────── */}
        <section className="overflow-hidden rounded-3xl border border-clSeafoam/60 bg-gradient-to-br from-clSand via-white to-clSeafoam/30 shadow-cl-card">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-clSeafoam/60 px-7 py-6 md:px-10">
            <div>
              <span className="cl-section-eyebrow mb-3 inline-flex">Featured</span>
              <h3 className="font-heading text-3xl text-clOcean">Brand Poster</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-500">
                A visual highlight reinforcing the Anti-Scam PH story and brand feel.
              </p>
            </div>
          </div>

          {/* Poster image — generous padding so it breathes inside the card */}
          <div className="p-6 md:p-8">
            <div className="relative overflow-hidden rounded-2xl border border-clSeafoam/60 bg-clSand shadow-[inset_0_2px_12px_rgba(13,30,66,0.06)]">
              <Image
                src="/poster1.png"
                alt="Anti-Scam PH brand poster"
                width={1600}
                height={900}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          </div>
        </section>
      </PageContainer>
    </>
  );
}
