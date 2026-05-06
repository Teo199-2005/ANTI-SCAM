import SectionHeading from "@/components/ui/SectionHeading";
import { images } from "@/lib/content/images";
import { Briefcase, Code2, Megaphone } from "lucide-react";
import Image from "next/image";

const people = [
  {
    name: "Charles Andrew Santiago",
    role: "CEO",
    bio: "Leads hospitality strategy and guest-centric innovation.",
    image: images.ceo,
    icon: "briefcase" as const,
    stripe: "from-clOcean to-clTeal",
    iconStyle: "border-clOcean/20 bg-clOcean/10 text-clOcean",
    ring: "ring-clOcean/20 group-hover:ring-clOcean/40",
    rolePill: "border-clSeafoam bg-clSeafoam/70 text-clOcean",
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
  {
    name: "Chief Operating Officer",
    role: "COO",
    bio: "Keeps day-to-day operations consistent, efficient, and ready for every guest stay.",
    image: images.coo,
    icon: "briefcase" as const,
    stripe: "from-slateBlue to-skyBlue",
    iconStyle: "border-indigo-200 bg-indigo-50 text-slateBlue",
    ring: "ring-slateBlue/20 group-hover:ring-slateBlue/40",
    rolePill: "border-indigo-200 bg-indigo-50 text-slateBlue",
  },
];

export default function VisionariesSection({ dark = false }: { dark?: boolean }) {
  return (
    <section className="section-padding">
      <div className="mb-3 flex justify-center">
        <span className="cl-section-eyebrow">Leadership</span>
      </div>
      <SectionHeading
        dark={dark}
        title="The Visionaries"
        subtitle="Meet our leadership team shaping premium digital hospitality."
      />

      <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {people.map((person) => (
          <article
            key={person.name}
            className="group flex flex-col overflow-hidden rounded-2xl border border-clSeafoam/60 bg-white/80 shadow-cl-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-clSeafoam hover:shadow-cl-card-hover"
          >
            {/* Per-role accent stripe */}
            <div className={`h-1 w-full bg-gradient-to-r ${person.stripe}`} />

            <div className="flex flex-col items-center px-5 pb-6 pt-5">
              {/* Photo */}
              <figure className="w-full max-w-[9.5rem]">
                <div
                  className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-clSand ring-2 transition-all duration-300 ${person.ring}`}
                >
                  <Image
                    src={person.image}
                    alt={person.name}
                    fill
                    className="object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 9.5rem, 9.5rem"
                  />
                </div>
              </figure>

              {/* Name */}
              <h3 className="mt-4 text-center font-heading text-lg leading-snug text-clOcean">
                {person.name}
              </h3>

              {/* Role pill */}
              <div className="mt-2 flex justify-center">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${person.rolePill}`}
                >
                  {person.icon === "code" ? (
                    <Code2 size={11} className="shrink-0" />
                  ) : person.icon === "megaphone" ? (
                    <Megaphone size={11} className="shrink-0" />
                  ) : (
                    <Briefcase size={11} className="shrink-0" />
                  )}
                  {person.role}
                </span>
              </div>

              {/* Bio */}
              <p className="mt-3 text-center text-sm leading-relaxed text-zinc-500">{person.bio}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
