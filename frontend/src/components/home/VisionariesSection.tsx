import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import { Briefcase, Code2 } from "lucide-react";
import { images } from "@/lib/content/images";

const people = [
  { name: "Elena Marquez", role: "CEO", bio: "Leads hospitality strategy and guest-centric innovation.", image: images.ceo },
  { name: "Adrian Cole", role: "Lead Developer", bio: "Builds resilient booking systems and elegant product experiences.", image: images.developer }
];

export default function VisionariesSection({ dark = false }: { dark?: boolean }) {
  return (
    <section className="section-padding">
      <SectionHeading dark={dark} title="The Visionaries" subtitle="Meet our CEO and Lead Developer shaping premium digital hospitality." />
      <div className="grid gap-6 md:grid-cols-2">
        {people.map((person) => (
          <Card key={person.name}>
            <img src={person.image} alt={person.name} className="h-64 w-full rounded-xl object-cover" />
            <h3 className="mt-4 font-heading text-2xl text-zinc-900">{person.name}</h3>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
              {person.role.includes("Developer") ? <Code2 size={14} /> : <Briefcase size={14} />}
              {person.role}
            </p>
            <p className="mt-2 text-zinc-600">{person.bio}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
