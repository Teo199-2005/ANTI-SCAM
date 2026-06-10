import type { Metadata } from "next";
import { Inter, Montserrat, Playfair_Display, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";
import Providers from "@/app/providers";
import WebSiteJsonLd from "@/components/seo/WebSiteJsonLd";
import { siteUrl } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"]
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["500", "600", "700", "800", "900"]
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["600", "700", "800"]
});

const site = siteUrl();
const defaultTitle = "Anti-Scam PH — Verified resort bookings in the Philippines";
const defaultDescription =
  "Book verified resorts with transparent pricing and scam-aware protections. Compare listings, secure your stay, and pay with confidence on the Philippines’ resort booking platform.";

export const metadata: Metadata = {
  metadataBase: new URL(`${site}/`),
  title: {
    default: defaultTitle,
    template: "%s | Anti-Scam PH"
  },
  description: defaultDescription,
  keywords: [
    "resort booking Philippines",
    "verified resorts",
    "anti-scam booking",
    "staycation",
    "Philippines travel",
    "resort reservations"
  ],
  applicationName: "Anti-Scam PH",
  icons: {
    icon: [
      { url: "/branding/mainlogo.png", type: "image/png", sizes: "32x32" },
      { url: "/branding/mainlogo.png", type: "image/png", sizes: "192x192" }
    ],
    apple: [{ url: "/branding/mainlogo.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "Anti-Scam PH",
    images: [
      {
        url: "/branding/mainlogo.png",
        width: 1200,
        height: 630,
        alt: "Anti-Scam PH — verified resort bookings"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    images: ["/branding/mainlogo.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} ${plusJakarta.variable} ${montserrat.variable} ${poppins.variable} min-h-screen bg-zinc-50 font-body`}
      >
        <WebSiteJsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
