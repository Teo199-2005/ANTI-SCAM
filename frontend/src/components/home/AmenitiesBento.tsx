import SectionHeading from "@/components/ui/SectionHeading";
import { Sparkles } from "lucide-react";
import { images } from "@/lib/content/images";
import Image from "next/image";

const items = [
  { title: "Oceanfront Spa", image: images.spa, className: "md:col-span-2" },
  { title: "Signature Dining", image: images.dining, className: "md:col-span-1" },
  { title: "Infinity Pools", image: images.pool, className: "md:col-span-1" },
  { title: "Private Villas", image: images.property2, className: "md:col-span-2" }
];

export default function AmenitiesBento({ dark = false }: { dark?: boolean }) {
  return (
    <section className="section-padding">
      <SectionHeading dark={dark} title="Resort Amenities" subtitle="A bento-style preview of curated experiences." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className={`soft-panel overflow-hidden ${item.className}`}>
            <div className="relative h-56 w-full">
              <Image src={item.image} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
            <div className="flex items-center gap-2 p-4">
              <span className="glass-pill-icon-sm">
                <Sparkles size={14} />
              </span>
              <h3 className="font-heading text-xl text-zinc-900">{item.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
