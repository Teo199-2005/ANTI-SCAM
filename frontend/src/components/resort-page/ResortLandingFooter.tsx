import { BrandWordmark } from "@/components/branding/BrandWordmark";
import type { LandingComputedFooter } from "@/lib/api/landingPage";
import { ExternalLink, Globe, Lock, Phone, Shield, Users } from "lucide-react";
import Link from "next/link";

const NAVY = "#0d1f3c";
const GOLD = "#f5a623";

type Props = {
  footer: LandingComputedFooter;
  resortName: string;
};

export function ResortLandingFooter({ footer, resortName }: Props) {
  return (
    <footer className="border-t border-zinc-200/90 text-zinc-800">
      {/* ── Navy mega-footer (marketing bar + columns) ─────────────────────── */}
      <section className="border-t-2 border-white/20" style={{ backgroundColor: NAVY }} aria-label="Anti-Scam PH">
        <div className="resort-landing-container py-12 sm:py-14">
          <div className="grid gap-12 max-lg:gap-10 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <Link
                href="/"
                aria-label="Anti-Scam PH home"
                className="inline-flex max-w-full flex-col items-start gap-3 rounded-lg outline-none ring-white/0 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-amber-300/90 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 p-1.5 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/mainlogo.png"
                    alt=""
                    width={40}
                    height={40}
                    className="h-9 w-9 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="min-w-0">
                  <BrandWordmark tone="onDark" size="lg" displayHeading className="scale-[1.02] sm:scale-100" />
                </span>
              </Link>
              <p
                className="mt-5 max-w-md text-sm leading-relaxed text-[#b0bcd4]"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                Anti-Scam PH helps Philippine resorts prevent fake bookings and build guest trust. This page is managed
                by the property and verified through our platform.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/90">
                  <Shield className="h-3.5 w-3.5 text-zinc-200" aria-hidden />
                  Verified resort workspace
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85">
                  <Users className="h-3.5 w-3.5 text-zinc-200" aria-hidden />
                  Guest-safe bookings
                </span>
              </div>
            </div>

            <div className="grid gap-10 max-lg:grid-cols-1 lg:col-span-4 lg:grid-cols-2">
              <div>
                <p className="mb-4 font-pop text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
                  Explore
                </p>
                <ul className="space-y-3 text-sm font-semibold text-white/90" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                  <li>
                    <Link href="/" className="inline-flex items-center gap-2 transition hover:text-amber-200">
                      <Globe className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      Anti-Scam PH home
                    </Link>
                  </li>
                  <li>
                    <Link href="/resorts" className="inline-flex items-center gap-2 transition hover:text-amber-200">
                      <ExternalLink className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      Browse resorts
                    </Link>
                  </li>
                  <li>
                    <a href="#rooms" className="inline-flex items-center gap-2 transition hover:text-amber-200">
                      Rooms on this page
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-4 font-pop text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
                  This resort
                </p>
                <ul className="space-y-3 text-sm text-[#b0bcd4]" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                  <li className="font-semibold text-white">{resortName}</li>
                  {footer.address ? <li className="leading-snug">{footer.address}</li> : null}
                  {footer.resortContact ? (
                    <li>
                      <a href={`tel:${footer.resortContact}`} className="font-semibold text-white underline-offset-2 hover:underline">
                        {footer.resortContact}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6 max-lg:gap-8 lg:col-span-3">
              <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
                  Founding partner rates
                </p>
                <p
                  className="mt-2 flex items-start gap-2 text-sm font-semibold leading-snug text-white"
                  style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                >
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden />
                  Locked pricing while your Anti-Scam PH subscription stays active.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-white/15 bg-white/5 px-5 py-5 sm:flex-row sm:items-center sm:gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/rising2brothers.png"
                  alt="The Rising 2 Brothers OPC"
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-xl border border-white/20 bg-white object-contain p-1 shadow-md"
                  loading="lazy"
                  decoding="async"
                />
                <p className="text-sm leading-snug text-white/80" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                  <span className="font-bold text-white">Powered by</span>{" "}
                  <Link href="/" className="font-bold text-amber-200 underline-offset-2 hover:underline">
                    The Rising 2 Brothers OPC
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          <p
            className="mt-12 border-t border-white/10 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[11px] font-medium text-[#8899b8]"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            © {new Date().getFullYear()} {resortName}. Anti-Scam PH · Platform v{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0"}
          </p>
        </div>
      </section>
    </footer>
  );
}
