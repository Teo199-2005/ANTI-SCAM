import { siteUrl } from "@/lib/site";

const defaultDescription =
  "Book verified resorts in the Philippines with transparent pricing and scam-aware protections. Compare listings, secure your stay, and pay with confidence.";

export default function WebSiteJsonLd() {
  const base = siteUrl();
  const origin = `${base}/`;

  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}#website`,
        name: "Anti-Scam PH",
        description: defaultDescription,
        url: origin,
        inLanguage: "en-PH",
        publisher: { "@id": `${origin}#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${origin}#organization`,
        name: "Anti-Scam PH",
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: `${base}/branding/mainlogo.png`,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
