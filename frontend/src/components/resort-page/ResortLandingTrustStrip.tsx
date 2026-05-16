import Image from "next/image";
import Link from "next/link";
import { Lock, MapPin, Phone, ShieldCheck } from "lucide-react";
import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { siteUrl } from "@/lib/site";

const iconDark = "h-5 w-5 shrink-0 text-zinc-100/90 [stroke-width:1.5]";
const iconLight = "h-5 w-5 shrink-0 text-navy/85 [stroke-width:1.5]";

type Props = {
  /** `full` = dark standalone strip; `panel` = compact light block inside the about/map band. */
  variant?: "full" | "panel";
};

/**
 * Platform trust band on the public landing page.
 * `panel` — left column of the about/map two-panel band; `full` — legacy dark strip (unused on landing).
 */
export function ResortLandingTrustStrip({ variant = "full" }: Props) {
  const isPanel = variant === "panel";
  const iconClass = isPanel ? iconLight : iconDark;
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
      <div
        className={
          isPanel
            ? "mb-5 flex flex-col gap-3 border-b border-zinc-300/70 pb-5 sm:mb-6 sm:pb-6"
            : "mb-6 flex flex-col items-center gap-3 border-b border-white/10 pb-6 sm:mb-8 sm:pb-8 md:flex-row md:justify-center md:gap-5"
        }
      >
        <Link
          href={platformHome}
          className={
            isPanel
              ? "group flex items-center gap-3 outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-navy/25 focus-visible:ring-offset-2"
              : "group flex max-w-full flex-col items-center gap-3 outline-none ring-offset-2 ring-offset-black transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/40 max-md:w-full max-md:rounded-2xl max-md:border max-md:border-white/12 max-md:bg-white/[0.06] max-md:px-4 max-md:py-3 max-md:backdrop-blur-md md:flex-row md:items-center md:gap-4 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
          }
        >
          <span
            className={
              isPanel
                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200/90 bg-white p-1.5 shadow-sm"
                : "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 p-1.5 shadow-inner"
            }
          >
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
            tone={isPanel ? "onLight" : "onDark"}
            size={isPanel ? "sm" : "md"}
            subtitle
            displayHeading
            className={isPanel ? "text-left" : "text-center md:text-left"}
          />
        </Link>
        {isPanel ? (
          <p
            className="text-xs font-medium text-zinc-600 sm:text-sm"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            Verified Resort Platform — listing safeguards for guests booking through this page.
          </p>
        ) : null}
      </div>

      <div
        className={
          isPanel
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
            : "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-x-0 md:gap-y-0"
        }
      >
        {items.map((item, i) => (
          <div
            key={item.title}
            className={
              isPanel
                ? "flex gap-3 rounded-xl border border-zinc-200/80 bg-white/70 p-3.5 shadow-sm backdrop-blur-sm"
                : i > 0
                  ? "flex flex-col items-center gap-2.5 border-zinc-800/80 text-center max-md:flex-row max-md:items-start max-md:rounded-2xl max-md:border max-md:border-white/12 max-md:bg-white/[0.05] max-md:p-4 max-md:text-left max-md:backdrop-blur-md md:items-start md:border-l md:pl-8 md:text-left lg:pl-10"
                  : "flex flex-col items-center gap-2.5 text-center max-md:flex-row max-md:items-start max-md:rounded-2xl max-md:border max-md:border-white/12 max-md:bg-white/[0.05] max-md:p-4 max-md:text-left max-md:backdrop-blur-md md:items-start md:text-left"
            }
          >
            {isPanel ? (
              <span className="mt-0.5 shrink-0" aria-hidden>
                {item.icon}
              </span>
            ) : (
              item.icon
            )}
            <div className={isPanel ? "min-w-0 flex-1" : undefined}>
              <p
                className={
                  isPanel
                    ? "font-pop text-[10px] font-semibold uppercase tracking-[0.12em] text-navy sm:text-[11px]"
                    : "font-pop text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-50 sm:text-xs"
                }
              >
                {item.title}
              </p>
              <p
                className={
                  isPanel
                    ? "mt-1 text-pretty text-[11px] leading-relaxed text-zinc-600 sm:text-xs"
                    : "max-w-[17rem] text-[11px] font-normal leading-relaxed text-zinc-300/95 max-md:min-w-0 max-md:flex-1 max-md:text-pretty sm:text-[12px] md:max-w-none"
                }
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
