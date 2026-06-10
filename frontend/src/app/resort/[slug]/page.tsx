import { ResortPublicLandingTemplate } from "@/components/resort-page/ResortPublicLandingTemplate";
import { getPublicResortBySubdomain } from "@/lib/api/landingPage";
import { siteUrl } from "@/lib/site";
import Link from "next/link";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

/**
 * Resolve a resort image path (which may be a relative `/storage/…` path or a full
 * HTTPS URL) into an **absolute** URL suitable for Open Graph `<meta>` tags.
 */
function resolveOgImageUrl(
  path: string | null | undefined,
  base: string,
): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const base = siteUrl();
  const fallbackOgImage = `${base}/branding/mainlogo.png`;

  const result = await getPublicResortBySubdomain(slug);
  if (!result.ok) {
    return {
      title: "Resort | Anti-Scam PH",
      openGraph: {
        title: "Resort | Anti-Scam PH",
        description:
          "Book verified resorts with transparent pricing on Anti-Scam PH.",
        images: [{ url: fallbackOgImage, width: 1200, height: 630, alt: "Anti-Scam PH" }],
      },
      twitter: {
        card: "summary_large_image",
        images: [fallbackOgImage],
      },
    };
  }

  const resort = result.data;
  const description =
    resort.description?.slice(0, 200) ||
    `Book your stay at ${resort.name} — verified on Anti-Scam PH.`;

  // Prefer the resort's background image, then logo, then platform fallback
  const ogImage =
    resolveOgImageUrl(resort.hero.bgImageUrl, base) ||
    resolveOgImageUrl(resort.hero.logoUrl, base) ||
    resolveOgImageUrl(resort.logoUrl, base) ||
    fallbackOgImage;

  return {
    title: `${resort.name} | Anti-Scam PH`,
    description,
    openGraph: {
      type: "website",
      locale: "en_PH",
      siteName: "Anti-Scam PH",
      title: `${resort.name} | Anti-Scam PH`,
      description,
      url: `${base}/resort/${slug}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${resort.name} — Anti-Scam PH`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${resort.name} | Anti-Scam PH`,
      description,
      images: [ogImage],
    },
  };
}

export default async function PublicResortLandingPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPublicResortBySubdomain(slug);

  if (!result.ok && result.status === 404) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-navy">Resort not found</h1>
        <p className="mt-2 text-zinc-600">This link is not linked to an active listing.</p>
        <Link href="/" className="mt-8 text-sky-700 underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (!result.ok && result.status === 403) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-navy">Page unavailable</h1>
        <p className="mt-2 max-w-md text-zinc-600">
          This resort&apos;s subscription is not active. Please check back later or contact the property directly.
        </p>
        <Link href="/" className="mt-8 text-sky-700 underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (!result.ok && result.status === 503) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-navy">Page coming soon</h1>
        <p className="mt-2 max-w-md text-zinc-600">This resort is still setting up their page. Check back shortly.</p>
        <Link href="/" className="mt-8 text-sky-700 underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-navy">Something went wrong</h1>
        <p className="mt-2 text-zinc-600">{result.message}</p>
        <Link href="/" className="mt-8 text-sky-700 underline">
          Back to home
        </Link>
      </div>
    );
  }

  return <ResortPublicLandingTemplate data={result.data} />;
}
