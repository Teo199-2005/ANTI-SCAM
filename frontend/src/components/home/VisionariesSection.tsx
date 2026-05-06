import SectionHeading from "@/components/ui/SectionHeading";
import { images } from "@/lib/content/images";
import { Briefcase, Building2, Code2, Megaphone } from "lucide-react";
import Image from "next/image";

const people = [
  {
    name: "Charles Andrew Santiago",
    role: "CEO",
    bio: "Leads hospitality strategy and guest-centric innovation.",
    image: images.ceo,
    icon: "briefcase" as const,
    stripe: "from-primaryBlue to-rose-400",
    iconStyle: "border-primaryBlue/25 bg-primaryBlue/10 text-primaryBlue",
    ring: "ring-primaryBlue/30 group-hover:ring-primaryBlue/50",
    rolePill: "border-primaryBlue/25 bg-primaryBlue/10 text-primaryBlue",
  },
  {
    name: "Chief Operating Officer",
    role: "COO",
    bio: "Keeps day-to-day operations consistent, efficient, and ready for every guest stay.",
    image: images.coo,
    icon: "building" as const,
    stripe: "from-slateBlue to-skyBlue",
    iconStyle: "border-indigo-200 bg-indigo-50 text-slateBlue",
    ring: "ring-slateBlue/20 group-hover:ring-slateBlue/40",
    rolePill: "border-indigo-200 bg-indigo-50 text-slateBlue",
  },
  {
    name: "Teofilo Harry Paet",
    role: "Lead Developer / CTO",
    bio: "Builds resilient booking systems and elegant product experiences.",
    image: images.developer,
    icon: "code" as const,
    stripe: "from-clTeal to-clTealLight",
    iconStyle: "border-blue-200 bg-blue-50 text-clTeal",
    ring: "ring-clTeal/20 group-hover:ring-clTeal/40",
    rolePill: "border-blue-200 bg-blue-50 text-clTeal",
  },
  {
    name: "Chief Marketing Officer",
    role: "CMO",
    bio: "Shapes brand narrative, campaigns, and trust across every guest touchpoint.",
    image: images.cmo,
    icon: "megaphone" as const,
    stripe: "from-clCoral to-clCoralDark",
    iconStyle: "border-yellow-200 bg-yellow-50 text-amber-700",
    ring: "ring-clCoral/30 group-hover:ring-clCoral/50",
    rolePill: "border-yellow-200 bg-yellow-50 text-amber-800",
  },
];

function RoleIcon({ kind }: { kind: (typeof people)[number]["icon"] }) {
  const cls = "shrink-0";
  if (kind === "code") return <Code2 size={15} className={cls} />;
  if (kind === "megaphone") return <Megaphone size={15} className={cls} />;
  if (kind === "building") return <Building2 size={15} className={cls} />;
  return <Briefcase size={15} className={cls} />;
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
      <div className="mb-3 flex justify-center">
        <span className="cl-section-eyebrow">Leadership</span>
      </div>
      <SectionHeading
        dark={dark}
        centered
        title="The Visionaries"
        subtitle="Meet our leadership team shaping premium digital hospitality."
      />

      {/*
        Two-up grid so each card is wide and readable. Order: CEO + COO on row 1, CTO + CMO on row 2.
        Very large screens: optional four-across for a single row.
      */}
      <div className="relative z-10 mx-auto grid max-w-[88rem] grid-cols-2 gap-4 sm:gap-6 md:grid-cols-2 md:gap-10 2xl:grid-cols-4 2xl:gap-8">
        {people.map((person) => (
          <article
            key={person.name}
            className="group relative isolate flex min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[1.75rem] border border-clSeafoam/70 bg-gradient-to-b from-white via-white to-clSand/35 shadow-[0_22px_56px_-32px_rgba(13,30,66,0.45)] ring-1 ring-white/90 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-clTeal/35 hover:shadow-[0_28px_64px_-28px_rgba(13,30,66,0.5)]"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-clSeafoam/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
            <div className={`relative h-2 w-full bg-gradient-to-r ${person.stripe}`} />

            <div className="relative flex flex-col items-center px-3 pb-5 pt-4 sm:px-6 sm:pb-8 sm:pt-6 md:px-9 md:pb-10 md:pt-9">
              <figure className="w-full max-w-[8.75rem] sm:max-w-[11.5rem] lg:max-w-[16.25rem]">
                <div
                  className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-clSand shadow-[0_12px_28px_-12px_rgba(13,30,66,0.35)] ring-2 ring-white transition-all duration-300 ${person.ring}`}
                >
                  <Image
                    src={person.image}
                    alt={person.name}
                    fill
                    className="object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-[1.05]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1536px) 16.25rem, 18rem"
                  />
                </div>
              </figure>

              <h3 className="mt-4 flex min-h-[3.1rem] w-full items-start justify-center text-balance text-center font-heading text-lg leading-snug text-clOcean sm:mt-5 sm:min-h-[4.1rem] sm:text-xl md:mt-6 md:min-h-[5rem] md:text-2xl">
                {person.name}
              </h3>

              <div className="mt-2.5 flex min-h-[2.2rem] w-full items-center justify-center px-1 sm:mt-3 sm:min-h-[2.4rem] md:mt-4 md:min-h-[2.6rem]">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold shadow-sm sm:px-3 sm:py-1.5 sm:text-xs md:gap-2 md:px-4 md:py-2 md:text-sm ${person.rolePill}`}
                >
                  <RoleIcon kind={person.icon} />
                  {person.role}
                </span>
              </div>

              <p className="mt-3 flex min-h-[5.9rem] w-full max-w-[26rem] items-start justify-center text-pretty border-t border-clSeafoam/50 pt-3 text-center text-sm leading-relaxed text-zinc-600 sm:mt-4 sm:min-h-[7.2rem] sm:pt-4 sm:text-base md:mt-5 md:min-h-[9rem] md:pt-5 md:text-[1.05rem]">
                {person.bio}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
