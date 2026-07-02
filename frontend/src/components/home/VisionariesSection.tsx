import { images } from "@/lib/content/images";
import { Briefcase } from "lucide-react";
import Image from "next/image";

const people = [
  {
    name: "Charles Andrew Santiago",
    role: "CEO",
    roleMeaning: "Chief Executive Officer",
    bio: "Leads hospitality strategy and guest-centric innovation, driving the vision to build the largest verified hospitality network in the Philippines. Under his leadership, Anti-Scam PH empowers legitimate resorts and protects travelers through technology, transparency, and trust — redefining how Filipinos discover and book safe, quality stays nationwide.",
    image: images.ceo,
    icon: "briefcase" as const,
    stripe: "from-primaryBlue to-rose-400",
    iconStyle: "border-primaryBlue/25 bg-primaryBlue/10 text-primaryBlue",
    ring: "ring-primaryBlue/30 group-hover:ring-primaryBlue/50",
    rolePill: "border-rose-300 bg-rose-50 text-rose-700",
    meaningText: "text-rose-600",
  },
];

function OperatorPoweredBy({ dark }: { dark: boolean }) {
  return (
    <div
      className={`flex w-full max-w-md shrink-0 flex-col items-center gap-3 rounded-2xl border px-5 py-4 shadow-sm sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-5 md:w-auto md:gap-5 md:px-6 md:py-5 ${
        dark ? "border-white/20 bg-white/10" : "border-clSeafoam/80 bg-white/90"
      }`}
    >
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center sm:h-24 sm:w-24 md:h-28 md:w-28">
        <Image
          src="/branding/rising2brothers.png"
          alt="The Rising 2 Brothers OPC — company logo"
          fill
          className="object-contain"
          sizes="(max-width: 768px) 5rem, 7rem"
          priority
        />
      </div>
      <div className="min-w-0 text-center sm:text-left">
        <p
          className={`text-[11px] font-bold uppercase tracking-[0.2em] ${
            dark ? "text-white/55" : "text-zinc-500"
          }`}
        >
          Powered by
        </p>
        <p
          className={`mt-1 font-heading text-3xl font-semibold leading-tight md:text-4xl ${
            dark ? "text-white" : "text-zinc-900"
          }`}
        >
          The Rising 2 Brothers OPC
        </p>
      </div>
    </div>
  );
}

export default function VisionariesSection({ dark = false }: { dark?: boolean }) {
  return (
    <section className="section-padding relative overflow-hidden pt-2 md:pt-4">
      {/* Bottom-right decorative diagonal stripes */}
      <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-4 z-0 hidden md:block">
        <div className="flex rotate-[-30deg] items-end gap-4 opacity-90">
          <span className="h-72 w-7 rounded-full bg-primaryBlue shadow-md" />
          <span className="h-[22rem] w-7 rounded-full bg-slateBlue shadow-md" />
          <span className="h-64 w-7 rounded-full bg-clCoral shadow-md" />
        </div>
      </div>

      {/* Mobile: operator above Leadership / Visionaries intro */}
      <div className="mb-6 flex justify-center px-2 md:hidden">
        <OperatorPoweredBy dark={dark} />
      </div>

      <div className="mb-3 flex justify-center">
        <span className="cl-section-eyebrow">Leadership</span>
      </div>

      <div className="mb-8 mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:items-center md:justify-between md:gap-10 lg:gap-12">
        <div className="w-full max-w-2xl text-center md:max-w-none md:flex-1 md:text-left">
          <div className="flex flex-col items-center gap-4 sm:gap-5 md:flex-row md:items-center md:gap-5 lg:gap-6">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm sm:h-24 sm:w-24 md:h-28 md:w-28">
              <Image
                src="/marketing/the-visionaries.png"
                alt="The Visionaries — Anti-Scam PH executive leadership emblem"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 5rem, 7rem"
                priority
              />
            </div>
            <div className="min-w-0">
              <h2
                className={`font-heading text-3xl font-semibold leading-tight tracking-tight md:text-4xl ${
                  dark ? "text-white" : "text-zinc-900"
                }`}
              >
                The Visionaries
              </h2>
              <p
                className={`mx-auto mt-2 max-w-2xl text-base md:mx-0 ${
                  dark ? "text-white/70" : "text-zinc-600"
                }`}
              >
                Meet our leadership team shaping premium digital hospitality.
              </p>
            </div>
          </div>
        </div>

        {/* Desktop / tablet: operator beside headline — shrink-0 keeps card height; items-center aligns with heading block */}
        <div className="hidden shrink-0 md:flex md:items-center">
          <OperatorPoweredBy dark={dark} />
        </div>
      </div>

      {/*
        Single CEO card — full-width container so the card breathes.
      */}
      <div className="relative z-10 mx-auto max-w-7xl">
        {people.map((person) => {
          const roleIcon = <Briefcase size={15} className="shrink-0" />;
          return (
            <article
              key={person.name}
              className="group relative isolate flex flex-col overflow-hidden rounded-[1.75rem] border border-clSeafoam/70 bg-gradient-to-b from-white via-white to-clSand/35 shadow-[0_22px_56px_-32px_rgba(13,30,66,0.45)] ring-1 ring-white/90 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-clTeal/35 hover:shadow-[0_28px_64px_-28px_rgba(13,30,66,0.5)]"
            >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-clSeafoam/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
            <div className={`relative h-2 w-full bg-gradient-to-r ${person.stripe}`} />

            <div className="relative flex flex-col items-center gap-6 px-4 py-6 sm:px-8 sm:py-8 md:flex-row md:items-center md:gap-10 md:px-10 md:py-10 lg:gap-12">
              <figure className="shrink-0 w-48 sm:w-56 md:w-72 lg:w-80 xl:w-96">
                <div
                  className={`relative aspect-square w-full overflow-hidden rounded-2xl bg-clSand shadow-[0_12px_28px_-12px_rgba(13,30,66,0.35)] ring-2 ring-white transition-all duration-300 ${person.ring}`}
                >
                  <Image
                    src={person.image}
                    alt={person.name}
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]"
                    sizes="(max-width: 768px) 50vw, (max-width: 1536px) 32rem, 36rem"
                  />
                </div>
              </figure>

              <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
                <h3 className="text-balance font-heading text-2xl leading-snug text-clOcean sm:text-3xl md:text-4xl lg:text-5xl">
                  {person.name}
                </h3>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm ring-1 ring-black/5 sm:px-3.5 sm:py-1.5 sm:text-sm md:gap-2 md:px-4 md:py-2 md:text-base ${person.rolePill}`}
                  >
                    {roleIcon}
                    {person.role}
                  </span>
                </div>
                <p className={`mt-1 text-xs font-semibold uppercase tracking-wide sm:text-sm md:text-base ${person.meaningText}`}>
                  {person.roleMeaning}
                </p>

                <p className="mt-4 text-pretty text-sm leading-relaxed text-zinc-600 sm:text-base md:text-lg lg:text-xl">
                  {person.bio}
                </p>
              </div>
            </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
