import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/app/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"]
});

export const metadata: Metadata = {
  title: "Anti-Scam PH — Resort Booking Platform",
  description: "Verify, check, and protect your resort booking. Philippines' anti-scam resort platform.",
  icons: {
    apple: "/mainlogo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${plusJakarta.variable} min-h-screen font-body`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
