import type { PublicResort } from "@/lib/api/public";
import { siteUrl } from "@/lib/site";

type Props = { resort: PublicResort };

/** LocalBusiness + LodgingBusiness-style structured data for public resort detail pages. */
export default function ResortJsonLd({ resort }: Props) {
  const base = siteUrl();
  const url = `${base}/resorts/${resort.id}`;

  const payload = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "LodgingBusiness"],
    "@id": `${url}#resort`,
    name: resort.name,
    description: resort.description ?? undefined,
    url,
    telephone: resort.contactNumber ?? undefined,
    address: resort.address
      ? {
          "@type": "PostalAddress",
          streetAddress: resort.address,
          addressCountry: "PH",
        }
      : undefined,
    priceRange: resort.rooms?.length
      ? `₱${Math.min(...resort.rooms.map((r) => r.basePrice))}+`
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
