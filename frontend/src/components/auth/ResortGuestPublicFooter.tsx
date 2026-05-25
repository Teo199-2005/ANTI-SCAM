"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { publicClient } from "@/lib/api/client";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { cn } from "@/lib/utils";
import { ExternalLink, Globe, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const NAVY = "#0d1f3c";
const GOLD = "#f5a623";

type ResortFooterPayload = {
  name: string;
  slug: string;
  contactNumber?: string | null;
  address?: string | null;
  logoUrl?: string | null;
};

type Props = {
  resortSlug: string;
};

const inter = { fontFamily: "var(--font-inter), system-ui, sans-serif" } as const;

const glassPanel =
  "flex min-h-0 flex-col rounded-2xl border border-white/15 bg-white/[0.06] p-5 shadow-inner backdrop-blur-sm";

/**
 * Guest login/register footer — same navy / gold system as {@link ResortLandingFooter}.
 */
export function ResortGuestPublicFooter({ resortSlug }: Props) {
  const [row, setRow] = useState<ResortFooterPayload | null>(null);

  useEffect(() => {
    const slug = resortSlug.trim();
    if (!slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await publicClient.get<{ success: boolean; data?: ResortFooterPayload }>(
          `/public/resorts/slug/${encodeURIComponent(slug)}`,
        );
        if (cancelled) return;
        if (data.success && data.data?.name) {
          setRow(data.data);
        } else {
          setRow(null);
        }
      } catch {
        if (!cancelled) setRow(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resortSlug]);

  const year = new Date().getFullYear();
  const logoAbs = row?.logoUrl ? laravelPublicUrl(row.logoUrl) : "";
  const resortHref = `/resort/${encodeURIComponent(resortSlug.trim())}`;
  const displayName = row?.name ?? "Resort";

  return (
    <footer className="mt-auto border-t border-zinc-200/90 text-zinc-800">
      <section className="border-t-2 border-white/20" style={{ backgroundColor: NAVY }} aria-label="Listing and platform">
        <div className="resort-landing-container px-4 py-10 sm:px-6 sm:py-12 md:px-8 lg:px-10">
          <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/"
              aria-label="Anti-Scam PH home"
              className="inline-flex max-w-full min-w-0 items-center gap-3 rounded-lg outline-none ring-white/0 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-amber-300/90"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 p-1.5 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/branding/mainlogo.png" alt="" width={36} height={36} className="h-8 w-8 object-contain" loading="lazy" decoding="async" />
              </span>
              <BrandWordmark tone="onDark" size="sm" className="min-w-0 leading-tight" />
            </Link>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/90">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-zinc-200" aria-hidden />
              Verified listing
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            <div className={glassPanel}>
              <p className="mb-3 font-pop text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
                This resort
              </p>
              <div className="flex items-start gap-3">
                {logoAbs ? (
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/10 p-0.5 shadow-inner">
                    <Image
                      src={logoAbs}
                      alt={`${displayName} logo`}
                      fill
                      className="object-contain p-1"
                      sizes="48px"
                      unoptimized
                    />
                  </span>
                ) : null}
                <div className="min-w-0">
                  <p className="font-heading text-base font-semibold text-white">{displayName}</p>
                  <p className="mt-1 text-xs font-medium text-[#b0bcd4]" style={inter}>
                    Guest booking · This listing
                  </p>
                </div>
              </div>
              {row?.address ? (
                <p className="mt-4 text-sm leading-relaxed text-[#b0bcd4]" style={inter}>
                  {row.address}
                </p>
              ) : null}
              {row?.contactNumber ? (
                <p className="mt-3 text-sm" style={inter}>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">Phone</span>
                  <br />
                  <a
                    href={`tel:${row.contactNumber.replace(/\s+/g, "")}`}
                    className="font-semibold text-white underline-offset-2 hover:text-amber-200 hover:underline"
                  >
                    {row.contactNumber}
                  </a>
                </p>
              ) : null}
            </div>

            <div className={cn(glassPanel, "justify-between gap-4")}>
              <div>
                <p className="mb-3 font-pop text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
                  Listing
                </p>
                <p className="text-sm leading-relaxed text-[#b0bcd4]" style={inter}>
                  Return to the public resort page for photos, rates, and availability.
                </p>
              </div>
              <Link
                href={resortHref}
                className="mt-auto inline-flex w-fit items-center gap-2 text-sm font-semibold text-white underline-offset-2 transition hover:text-amber-200 hover:underline"
                style={inter}
              >
                <ExternalLink className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                View resort page
              </Link>
            </div>

            <div className={cn(glassPanel, "justify-between gap-4")}>
              <div>
                <p className="mb-3 font-pop text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
                  Platform
                </p>
                <p className="text-sm leading-relaxed text-[#b0bcd4]" style={inter}>
                  Listings and secure booking tools are{" "}
                  <span className="font-semibold text-white/95">powered by Anti-Scam PH</span>. For platform support see{" "}
                  <Link href="/contact" className="font-semibold text-amber-200/95 underline-offset-2 hover:underline">
                    Contact
                  </Link>
                  .
                </p>
                <ul className="mt-4 space-y-2.5 text-sm font-semibold text-white/90" style={inter}>
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
                </ul>
              </div>
            </div>
          </div>

          <p
            className="mt-10 border-t border-white/10 pt-6 text-center text-[11px] font-medium text-[#8899b8]"
            style={inter}
          >
            © {year} {displayName}. Anti-Scam PH · Platform v{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0"}
          </p>
        </div>
      </section>
    </footer>
  );
}
