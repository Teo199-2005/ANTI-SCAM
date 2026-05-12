import { ResortPublicLandingTemplate } from "@/components/resort-page/ResortPublicLandingTemplate";
import { getPublicResortBySubdomain } from "@/lib/api/landingPage";
import Link from "next/link";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicResortBySubdomain(slug);
  if (!result.ok) {
    return { title: "Resort | Anti-Scam PH" };
  }
  return { title: `${result.data.name} | Anti-Scam PH` };
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
