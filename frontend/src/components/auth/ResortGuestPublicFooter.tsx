"use client";

import { publicClient } from "@/lib/api/client";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

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

/**
 * Compact footer for guest login/register opened from a public resort listing —
 * resort contact first, then a short platform attribution (not the full marketing footer).
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

  const box =
    "flex min-h-0 flex-col rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm shadow-zinc-900/[0.03] sm:p-4";

  return (
    <footer className="mt-auto border-t border-zinc-200/90 bg-white/95 px-4 py-8 text-sm text-zinc-700 shadow-[0_-8px_30px_-18px_rgba(13,30,66,0.12)]">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <div className={box}>
          <div className="flex items-start gap-2.5">
            {logoAbs ? (
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <Image
                  src={logoAbs}
                  alt={`${row?.name ?? "Resort"} logo`}
                  fill
                  className="object-contain p-0.5"
                  sizes="44px"
                  unoptimized
                />
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold text-navy">{row?.name ?? "Resort"}</p>
              <p className="text-xs text-zinc-500">Guest booking · This listing</p>
            </div>
          </div>
          {row?.address ? <p className="mt-3 text-xs leading-relaxed text-zinc-600">{row.address}</p> : null}
          {row?.contactNumber ? (
            <p className="mt-2 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-700">Phone:</span> {row.contactNumber}
            </p>
          ) : null}
        </div>

        <div className={cn(box, "justify-between gap-3")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Listing</p>
          <p className="text-sm text-zinc-700">Return to the public resort page for photos, rates, and availability.</p>
          <Link
            href={resortHref}
            className="mt-auto inline-flex w-fit items-center font-semibold text-clOcean underline-offset-2 hover:underline"
          >
            View resort page →
          </Link>
        </div>

        <div className={cn(box, "justify-between gap-3 text-[11px] leading-relaxed text-zinc-500")}>
          <p>
            Listings and secure booking tools are{" "}
            <Link href="/" className="font-semibold text-navy underline-offset-2 hover:underline">
              powered by Anti-Scam PH
            </Link>
            . For platform support see{" "}
            <Link href="/contact" className="font-semibold text-clOcean underline-offset-2 hover:underline">
              Contact
            </Link>
            .
          </p>
          <p className="mt-auto text-zinc-400">© {year} {row?.name ?? "Resort"}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
