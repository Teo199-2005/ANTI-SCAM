import PageContainer from "@/components/layout/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";
import VisionariesSection from "@/components/home/VisionariesSection";
import Image from "next/image";
import {
  Award,
  BadgeCheck,
  CalendarCheck2,
  Flag,
  Gem,
  type LucideProps,
  MessageSquareOff,
  ShieldCheck,
  Sparkles,
  Settings2,
  Target,
  TrendingUp,
  Zap,
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

const highlights = [
  "Trusted booking experiences for modern resorts",
  "Operational clarity for lean hospitality teams",
  "Guest-first product design from discovery to checkout",
];

const pillars = [
  {
    icon: Target,
    title: "Mission",
    description:
      "Help resorts operate with clarity while giving guests a transparent, stress-free reservation journey.",
    stripe: "from-clCoral to-clCoralDark",
    iconStyle: "border-yellow-200 bg-yellow-50 text-amber-700",
  },
  {
    icon: Flag,
    title: "Vision",
    description:
      "Become the most trusted booking operating system for premium staycations in the Philippines.",
    stripe: "from-clTeal to-clTealLight",
    iconStyle: "border-blue-200 bg-blue-50 text-clTeal",
  },
  {
    icon: Gem,
    title: "Values",
    description:
      "Reliability, guest-first communication, operational accuracy, and long-term platform trust.",
    stripe: "from-clOcean to-clTeal",
    iconStyle: "border-clSeafoam bg-clSeafoam/60 text-clOcean",
  },
];

const milestones = [
  "Launched unified dashboards so owners simplify property management from one place",
  "Shipped branded public listings and verified flows to legitimize staycation businesses",
  "Added real-time locks and availability so double bookings stopped cold",
  "Refined the guest path so easy booking became the default — fewer drop-offs, clearer fees",
  "Put policies and pricing on-page so redundant inquiries dropped and teams stayed focused",
];

const problemsWeSolve = [
  {
    icon: Settings2,
    title: "Simplify your property management",
    pain: "Spreadsheets, DMs, and disconnected tools create chaos.",
    solution:
      "Rooms, calendar, reservations, and guest context live in one dashboard built for small resort teams.",
    stripe: "from-clOcean to-clTeal",
    iconStyle: "border-clOcean/20 bg-clOcean/10 text-clOcean",
  },
  {
    icon: Award,
    title: "Legitimize your resort or staycation business",
    pain: "Guests hesitate when booking feels informal or unclear.",
    solution:
      "A professional listing, transparent fees, and a guided checkout build trust like a serious operator.",
    stripe: "from-clTeal to-clTealLight",
    iconStyle: "border-blue-200 bg-blue-50 text-clTeal",
  },
  {
    icon: CalendarCheck2,
    title: "No more double bookings",
    pain: "Manual calendars sell the same night twice under pressure.",
    solution:
      "Availability and time-limited locks sync instantly so a sold night is gone from the book immediately.",
    stripe: "from-emerald-500 to-emerald-400",
    iconStyle: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    icon: Zap,
    title: "Easy booking",
    pain: "Long forms and vague steps make guests abandon halfway.",
    solution:
      "A short, guided flow from dates to ₱500 confirmation keeps momentum and reduces support ping-pong.",
    stripe: "from-clCoral to-clCoralDark",
    iconStyle: "border-yellow-200 bg-yellow-50 text-amber-700",
  },
  {
    icon: MessageSquareOff,
    title: "No more annoying redundant inquiries",
    pain: "The same five questions repeat in chat all day.",
    solution:
      "Self-serve listing content answers availability, policy, and pricing before anyone has to message you.",
    stripe: "from-slateBlue to-skyBlue",
    iconStyle: "border-indigo-200 bg-indigo-50 text-slateBlue",
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
            {/* Left — brand statement */}
            <div className="p-7 md:border-r md:border-clSeafoam/50 md:p-10">
              <span className="cl-section-eyebrow mb-4 inline-flex">Who We Are</span>
              <SectionHeading
                title="About Us"
                subtitle="We design serene stays and trustworthy booking experiences for modern travelers."
              />
              <p className="max-w-2xl text-base leading-8 text-zinc-600">
                Anti-Scam PH exists to help resorts operate with confidence and give guests a seamless
                path from discovery to confirmed reservation. Our platform combines elegant design with
                reliable booking logic tailored for hospitality teams.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="inline-flex items-center gap-1.5 rounded-full border border-clSeafoam bg-clSeafoam/60 px-3.5 py-1.5 text-xs font-semibold text-clOcean shadow-sm"
                  >
                    <Sparkles className="h-3 w-3 text-clCoral" />
                    {highlight}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — two info cards */}
            <div className="flex flex-col divide-y divide-clSeafoam/50">
              <div className="flex flex-col justify-center bg-clSeafoam/25 p-6 md:p-8">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="inline-flex rounded-xl border border-clOcean/20 bg-white p-2 shadow-sm text-clOcean">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-clOcean">
                    Platform Promise
                  </p>
                </div>
                <p className="text-sm leading-7 text-zinc-600">
                  Clear pricing, protected availability, and guest-facing transparency built into every
                  booking flow.
                </p>
              </div>
              <div className="flex flex-col justify-center bg-white/50 p-6 md:p-8">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="inline-flex rounded-xl border border-primaryBlue/20 bg-white p-2 shadow-sm">
                    <BadgeCheck className="h-4 w-4 text-primaryBlue" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-clOcean">
                    Why Teams Choose Us
                  </p>
                </div>
                <p className="text-sm leading-7 text-zinc-600">
                  Small resort operators get one polished system for listings, reservations, schedules,
                  and guest trust.
                </p>
              </div>
            </div>
          </div>
        </section>

        <SectionDivider icon={Sparkles} />

        {/* ── Problems We Solve ─────────────────────────────────────── */}
        <section>
          <span className="cl-section-eyebrow mb-4 inline-flex">Pain Points</span>
          <SectionHeading
            title="Problems We Solve"
            subtitle="Five pain points we hear from resort and staycation operators — and how Anti-Scam PH removes them."
          />
          <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {problemsWeSolve.map((item) => (
              <article
                key={item.title}
                className="group flex flex-col overflow-hidden rounded-2xl border border-clSeafoam/60 bg-white/85 shadow-cl-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-clSeafoam hover:shadow-cl-card-hover"
              >
                {/* Accent stripe */}
                <div className={`h-1 w-full bg-gradient-to-r ${item.stripe}`} />

                <div className="flex flex-col gap-3.5 p-5">
                  {/* Icon */}
                  <div className={`inline-flex w-fit rounded-xl border p-2.5 transition-transform duration-300 group-hover:scale-110 ${item.iconStyle}`}>
                    <item.icon size={16} />
                  </div>

                  {/* Title */}
                  <h3 className="font-heading text-lg leading-snug text-clOcean">{item.title}</h3>

                  {/* Pain pill */}
                  <div className="rounded-xl border border-clCoral/25 bg-clCoral/10 px-3.5 py-2.5">
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700/70">
                      Pain Point
                    </p>
                    <p className="text-sm font-medium text-clOcean/85">{item.pain}</p>
                  </div>

                  {/* Solution */}
                  <div>
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                      We Fix It
                    </p>
                    <p className="text-sm leading-6 text-zinc-500">{item.solution}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <SectionDivider icon={Target} />

        {/* ── Mission / Vision / Values ──────────────────────────────── */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-clOcean via-clTeal to-slateBlue shadow-[0_32px_80px_-40px_rgba(13,30,66,0.75)] ring-1 ring-inset ring-white/10">
          <div className="p-7 md:p-10">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
              Principles
            </span>
            <SectionHeading
              title="Mission, Vision & Values"
              subtitle="The principles behind every product decision, booking flow, and hospitality experience we shape."
              dark
            />
            <div className="mt-4 grid gap-5 sm:grid-cols-3">
              {pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/8 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/12"
                >
                  <div className={`h-0.5 w-full bg-gradient-to-r ${pillar.stripe}`} />
                  <div className="p-6">
                    <div className={`inline-flex rounded-xl border p-3 ${pillar.iconStyle} transition-transform duration-300 group-hover:scale-110`}>
                      <pillar.icon size={18} />
                    </div>
                    <h3 className="mt-4 font-heading text-xl text-white">{pillar.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/70">{pillar.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SectionDivider icon={TrendingUp} />

        {/* ── Our Journey ────────────────────────────────────────────── */}
        <section>
          <div className="soft-panel rounded-3xl p-7 md:p-9">
            <span className="cl-section-eyebrow mb-4 inline-flex">Milestones</span>
            <div className="mb-7 flex items-center gap-3">
              <div className="inline-flex rounded-full bg-gradient-to-br from-clOcean to-clTeal p-3 text-white shadow-cl-btn">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-3xl text-clOcean">Our Journey</h3>
                <p className="mt-0.5 text-sm text-zinc-500">Key milestones that shaped the platform</p>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {milestones.map((milestone, index) => (
                <li
                  key={milestone}
                  className="group flex items-start gap-4 rounded-2xl border border-clSeafoam/60 bg-clSand/50 p-4 transition-all duration-200 hover:border-clTeal/30 hover:bg-clSeafoam/30 hover:shadow-sm"
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clOcean to-clTeal text-xs font-bold text-white shadow-sm">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-7 text-zinc-600 transition-colors duration-200 group-hover:text-zinc-800">
                    {milestone}
                  </span>
                </li>
              ))}
            </ul>
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
