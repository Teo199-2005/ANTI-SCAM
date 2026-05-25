import { BrandWordmark } from "@/components/branding/BrandWordmark";
import type { LandingComputedFooter } from "@/lib/api/landingPage";
import { VerifiedBadge } from "@/components/badges/VerifiedBadge";
import { ExternalLink, Globe, Users } from "lucide-react";
import Link from "next/link";

const NAVY = "#0d1f3c";
const GOLD = "#f5a623";

type Props = {
  footer: LandingComputedFooter;
  resortName: string;
  isPremiumVerified?: boolean;
};

export function ResortLandingFooter({ footer, resortName, isPremiumVerified = false }: Props) {
  return (
    <footer className="border-t border-zinc-200/90 text-zinc-800">
      <section className="border-t-2 border-white/20" style={{ backgroundColor: NAVY }} aria-label="Anti-Scam PH">
        <div className="resort-landing-container py-6 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0 lg:max-w-[min(100%,20rem)]">
              <Link
                href="/"
                aria-label="Anti-Scam PH home"
                className="inline-flex items-center gap-3 rounded-lg outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-amber-300/90"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 p-1 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/branding/mainlogo.png"
                    alt=""
                    width={32}
                    height={32}
                    className="h-7 w-7 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <BrandWordmark tone="onDark" size="sm" displayHeading />
              </Link>
              <p
                className="mt-2 text-xs leading-snug text-[#b0bcd4]"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                Verified resort page · guest-safe bookings through Anti-Scam PH.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                  <VerifiedBadge
                    premium={isPremiumVerified}
                    size="xs"
                    standardIconClassName="h-3 w-3 text-zinc-200"
                  />
                  {isPremiumVerified ? "Premium verified" : "Verified"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/85">
                  <Users className="h-3 w-3 text-zinc-200" aria-hidden />
                  Guest-safe
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:gap-10 lg:gap-12">
              <div>
                <p className="mb-2 font-pop text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
                  Explore
                </p>
                <ul
                  className="space-y-1.5 text-xs font-semibold text-white/90"
                  style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                >
                  <li>
                    <Link href="/" className="inline-flex items-center gap-1.5 transition hover:text-amber-200">
                      <Globe className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link href="/resorts" className="inline-flex items-center gap-1.5 transition hover:text-amber-200">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      Resorts
                    </Link>
                  </li>
                  <li>
                    <a href="#rooms" className="transition hover:text-amber-200">
                      Rooms
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-pop text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
                  This resort
                </p>
                <ul
                  className="space-y-1.5 text-xs text-[#b0bcd4]"
                  style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                >
                  <li className="font-semibold text-white">{resortName}</li>
                  {footer.address ? <li className="leading-snug">{footer.address}</li> : null}
                  {footer.resortContact ? (
                    <li>
                      <a
                        href={`tel:${footer.resortContact}`}
                        className="font-semibold text-white underline-offset-2 hover:underline"
                      >
                        {footer.resortContact}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center sm:flex-row sm:text-left"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            <p className="text-[10px] font-medium text-[#8899b8]">
              © {new Date().getFullYear()} {resortName} · Anti-Scam PH v
              {process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0"}
            </p>
            <p className="inline-flex items-center gap-2 text-[10px] text-white/75">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/branding/rising2brothers.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 rounded border border-white/20 bg-white object-contain p-0.5"
                loading="lazy"
                decoding="async"
              />
              <span>
                Powered by{" "}
                <Link href="/" className="font-semibold text-amber-200/95 underline-offset-2 hover:underline">
                  The Rising 2 Brothers OPC
                </Link>
              </span>
            </p>
          </div>
        </div>
      </section>
    </footer>
  );
}
