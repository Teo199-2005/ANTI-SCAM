import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import Badge from "@/components/ui/Badge";
import { Tag } from "lucide-react";
import { images } from "@/lib/content/images";
import { formatPhpPerNight } from "@/lib/formatPhp";
import Image from "next/image";

const properties = [
  { name: "Azure Cliff Suites", image: images.property1, priceFrom: 7900 },
  { name: "Sienna Coast Villas", image: images.property2, priceFrom: 9200 },
  { name: "Skyline Cove Retreat", image: images.property3, priceFrom: 6500 },
];

export default function FeaturedProperties({ dark = false }: { dark?: boolean }) {
  return (
    <section className="section-padding">
      <SectionHeading dark={dark} title="Featured Properties" subtitle="Handpicked resorts and staycation destinations — curated for unforgettable escapes." />
      <div className="grid gap-6 md:grid-cols-3">
        {properties.map((property) => (
          <Card key={property.name} className="shadow-float">
            <div className="relative h-64 w-full">
              <Image src={property.image} alt={property.name} fill className="rounded-xl object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <h3 className="font-heading text-xl text-zinc-900">{property.name}</h3>
              <Badge text="Featured" />
            </div>
            <p className="mt-2 inline-flex items-center gap-2 text-zinc-700">
              <Tag size={14} />
              {`From ${formatPhpPerNight(property.priceFrom)}`}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
