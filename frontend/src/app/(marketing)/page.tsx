import HeroSection from "@/components/home/HeroSection";
import type { Metadata } from "next";

const homeTitle = "Anti-Scam PH — Verified resort bookings & scam-aware protection";
const homeDescription =
  "Discover verified resorts across the Philippines. Transparent pricing, secure booking flow, and protections designed to reduce scam risk—plan your staycation with confidence.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: "/",
    images: [{ url: "/coverphoto.png", width: 1536, height: 1024, alt: "Anti-Scam PH resort booking" }]
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: ["/coverphoto.png"]
  }
};

export default function Home() {
  return <HeroSection />;
}
