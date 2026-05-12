import Image from "next/image";
import Link from "next/link";
import { Lock, MapPin, Phone, ShieldCheck } from "lucide-react";
import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { siteUrl } from "@/lib/site";

const iconClass = "h-5 w-5 shrink-0 text-zinc-100/90 [stroke-width:1.5]";

/**
 * Platform trust band — directly under the resort hero on the public landing page.
 * Desktop (`md:`+): original multi-column trust grid. Narrow viewports: single column, glass-style rows.
 */
export function ResortLandingTrustStrip() {
  const platformHome = siteUrl();

  const items = [
    {
      icon: <ShieldCheck className={iconClass} aria-hidden />,
      title: "Verified listing",
      text: "This resort is listed on Anti-Scam PH with verified booking safeguards.",
    },
    {
      icon: <MapPin className={iconClass} aria-hidden />,
      title: "Property details",
      text: "Location and contact below are supplied by the resort for guest inquiries.",
    },
    {
      icon: <Phone className={iconClass} aria-hidden />,
      title: "Direct line",
      text: "Call the resort or representative using the numbers in this footer.",
    },
    {
      icon: <Lock className={iconClass} aria-hidden />,
      title: "Secure bookings",
      text: "Platform fee protection helps reduce scam bookings and double reservations.",
    },
  ] as const;

  return (
    <div role="region" aria-label="Anti-Scam PH trust and safeguards">
      <div className="mb-6 flex flex-col items-center gap-3 border-b border-white/10 pb-6 sm:mb-8 sm:pb-8 md:flex-row md:justify-center md:gap-5">
        <Link
          href={platformHome}
          className="group flex max-w-full flex-col items-center gap-3 outline-none ring-offset-2 ring-offset-black transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/40 max-md:w-full max-md:rounded-2xl max-md:border max-md:border-white/12 max-md:bg-white/[0.06] max-md:px-4 max-md:py-3 max-md:backdrop-blur-md md:flex-row md:items-center md:gap-4 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 p-1.5 shadow-inner">
            <Image
              src="/mainlogo.png"
              alt="Anti-Scam PH"
              width={40}
              height={40}
              unoptimized
              className="h-9 w-9 object-contain"
            />
          </span>
          <BrandWordmark
            as="span"
            tone="onDark"
            size="md"
            subtitle
            displayHeading
            className="text-center md:text-left"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-x-0 md:gap-y-0">
      {items.map((item, i) => (
        <div
          key={item.title}
          className={
            i > 0
              ? "flex flex-col items-center gap-2.5 border-zinc-800/80 text-center max-md:flex-row max-md:items-start max-md:rounded-2xl max-md:border max-md:border-white/12 max-md:bg-white/[0.05] max-md:p-4 max-md:text-left max-md:backdrop-blur-md md:items-start md:border-l md:pl-8 md:text-left lg:pl-10"
              : "flex flex-col items-center gap-2.5 text-center max-md:flex-row max-md:items-start max-md:rounded-2xl max-md:border max-md:border-white/12 max-md:bg-white/[0.05] max-md:p-4 max-md:text-left max-md:backdrop-blur-md md:items-start md:text-left"
          }
        >
          {item.icon}
          <p className="font-pop text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-50 sm:text-xs">
            {item.title}
          </p>
          <p
            className="max-w-[17rem] text-[11px] font-normal leading-relaxed text-zinc-300/95 max-md:min-w-0 max-md:flex-1 max-md:text-pretty sm:text-[12px] md:max-w-none"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            {item.text}
          </p>
        </div>
      ))}
      </div>
    </div>
  );
}
