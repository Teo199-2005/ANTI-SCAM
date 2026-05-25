import type { Metadata } from "next";
import { LandingPremiumPage } from "@/components/landing-preview/LandingPremiumPage";

const homeTitle = "Anti-Scam PH — Verified resort bookings in the Philippines";
const homeDescription =
  "Anti-Scam PH helps Philippine resorts prevent fake bookings, avoid double reservations, and build guest trust through verified booking technology. Plan your staycation with confidence.";

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
        url: "/marketing/founding500.png",
        width: 560,
        height: 620,
        alt: "Anti-Scam PH founding resort partners",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: ["/marketing/founding500.png"],
  },
};

export default function Home() {
  return <LandingPremiumPage />;
}
