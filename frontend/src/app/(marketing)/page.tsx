import type { Metadata } from "next";
import { LandingPremiumPage } from "@/components/landing-preview/LandingPremiumPage";
import { siteUrl } from "@/lib/site";

const base = siteUrl().replace(/\/+$/, "");
const homeTitle = "Anti-Scam PH — Verified resort bookings in the Philippines";
const homeDescription =
  "Book verified resorts with transparent pricing and scam-aware protections. Compare listings, secure your stay, and pay with confidence on the Philippines’ resort booking platform.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: "/",
    images: [
      {
        url: `${base}/branding/mainlogo.png`,
        width: 1200,
        height: 630,
        alt: "Anti-Scam PH — verified resort bookings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: [`${base}/branding/mainlogo.png`],
  },
};

export default function Home() {
  return <LandingPremiumPage />;
}
