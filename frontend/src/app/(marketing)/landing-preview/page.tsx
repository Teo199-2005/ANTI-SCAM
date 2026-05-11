import type { Metadata } from "next";
import { LandingPremiumPage } from "@/components/landing-preview/LandingPremiumPage";

export const metadata: Metadata = {
  title: "Landing preview — Anti-Scam PH",
  description:
    "Premium draft landing for the Philippine verified resort platform — glass hero, founding partner badge, and pricing.",
  robots: { index: false, follow: false },
};

export default function LandingPreviewPage() {
  return <LandingPremiumPage />;
}
