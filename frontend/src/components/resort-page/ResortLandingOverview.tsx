import { laravelPublicUrl } from "@/lib/publicAsset";
import type { ResortLandingSurface } from "@/components/resort-page/resortLandingSurface";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  BedDouble,
  Building2,
  CalendarDays,
  ChevronDown,
  Link2,
  Mail,
  MapPin,
  MessageSquareText,
  Navigation,
  Phone,
  Shield,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";

const iconTile =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/90 bg-zinc-50/90 text-zinc-500 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.65]";

type Props = {
  resortName: string;
  listingSlug: string;
  logoUrl: string | null;
  contactNumber: string | null;
  address: string | null;
  amenities: string[];
  cancellationPolicy: string | null;
  surface: ResortLandingSurface;
  description: string | null;
  roomsCount: number;
  isVip: boolean;
  contactEmail: string | null;
  mapSearchUrl: string | null;
};

function normalizeAmenities(raw: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}

export function ResortLandingOverview({
  resortName,
  listingSlug,
  logoUrl,
  contactNumber,
  address,
  amenities,
  cancellationPolicy,
  surface,
  description,
  roomsCount,
  isVip,
  contactEmail,
  mapSearchUrl,
}: Props) {
  const chips = normalizeAmenities(amenities);
  const policy = cancellationPolicy?.trim() ?? "";
  const band = surface === "odd" ? "resort-landing-band-odd" : "resort-landing-band-even";
  const revealDir = surface === "odd" ? "up" : "down";
  const blurb = description?.trim() ?? "";
  const listingPath = `/resort/${encodeURIComponent(listingSlug)}`;

  return (
    <section id="info" className={cn("resort-landing-section scroll-mt-24 border-t border-zinc-200/70", band)}>
      <ScrollReveal className="resort-landing-container" direction={revealDir} delayMs={40}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between max-lg:gap-5">
          <div className="max-lg:max-w-[22rem]">
            <p className="resort-landing-muted">Resort overview</p>
            <h2 className="font-pop mt-1 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">At a glance</h2>
            <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-zinc-600 max-lg:max-w-full">
              Verified contact and listing details from the property&apos;s Anti-Scam PH profile. Use this section to
              confirm the resort identity before you book.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 max-lg:pt-1 sm:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 shadow-sm">
              <span className={iconTile} aria-hidden>
                <Shield />
              </span>
              Verified listing
            </span>
            {isVip ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 shadow-sm">
                <span className={iconTile} aria-hidden>
                  <Star />
                </span>
                Featured partner
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-5 h-px max-w-lg bg-gradient-to-r from-zinc-400/65 via-zinc-200/90 to-transparent" />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-lg:gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
            <span className={iconTile} aria-hidden>
              <BedDouble />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Rooms online</p>
              <p className="text-sm font-semibold text-navy">
                {roomsCount > 0 ? (
                  <>
                    {roomsCount} {roomsCount === 1 ? "type" : "types"} to book
                  </>
                ) : (
                  "None listed yet"
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
            <span className={iconTile} aria-hidden>
              <BadgeCheck />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Platform</p>
              <p className="text-sm font-semibold text-navy">Reservation fee protection</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm sm:col-span-2 lg:col-span-1">
            <span className={iconTile} aria-hidden>
              <Link2 />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Listing</p>
              <p className="truncate font-mono text-xs font-medium text-zinc-700">{listingPath}</p>
            </div>
          </div>
        </div>

        {blurb ? (
          <div className="mt-6 rounded-xl border border-zinc-200/80 bg-white/60 p-4 sm:p-5">
            <div className="flex gap-3">
              <span className={iconTile} aria-hidden>
                <MessageSquareText />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">About this listing</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-700 line-clamp-6 sm:line-clamp-none">{blurb}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-6 max-w-2xl text-sm italic leading-relaxed text-zinc-500">
            This resort has not added a short public description yet. The hero summary and room cards still describe what
            guests can expect.
          </p>
        )}

        <div className="mt-8 grid gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="resort-landing-card lg:col-span-4">
            <div className="flex items-center gap-2">
              <span className={iconTile} aria-hidden>
                <Building2 />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Property</p>
            </div>
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              {logoUrl ? (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm sm:h-28 sm:w-28">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={laravelPublicUrl(logoUrl)} alt="" className="max-h-full max-w-full object-contain p-2" />
                </div>
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400">
                  No logo
                </div>
              )}
              <div className="min-w-0 text-center sm:text-left">
                <p className="font-heading text-lg font-semibold text-navy">{resortName}</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Official name as registered on Anti-Scam PH. Compare spelling and logo with resort signage and
                  confirmations.
                </p>
                <Link
                  href={listingPath}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 underline-offset-2 hover:text-navy hover:underline"
                >
                  Open this listing path
                  <span className="text-zinc-400" aria-hidden>
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div className="resort-landing-card lg:col-span-4">
            <div className="flex items-center gap-2">
              <span className={iconTile} aria-hidden>
                <Phone />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Reach the resort</p>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] font-medium text-zinc-500">Phone</p>
                {contactNumber ? (
                  <a
                    href={`tel:${contactNumber}`}
                    className="mt-1 flex items-start gap-2 text-base font-semibold text-navy underline-offset-2 hover:text-zinc-800 hover:underline"
                  >
                    <span className={cn(iconTile, "mt-0.5")} aria-hidden>
                      <Phone />
                    </span>
                    <span>{contactNumber}</span>
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-zinc-400">Not provided</p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500">Address</p>
                {address ? (
                  <div className="mt-1 flex items-start gap-2 text-sm leading-relaxed text-zinc-700">
                    <span className={cn(iconTile, "mt-0.5")} aria-hidden>
                      <MapPin />
                    </span>
                    <span>{address}</span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-zinc-400">Not provided</p>
                )}
                {address && mapSearchUrl ? (
                  <a
                    href={mapSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 underline-offset-2 hover:text-navy hover:underline"
                  >
                    <span className={iconTile} aria-hidden>
                      <Navigation />
                    </span>
                    Preview directions in Google Maps
                  </a>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500">Email</p>
                {contactEmail ? (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="mt-1 flex items-start gap-2 text-sm font-semibold text-navy underline-offset-2 hover:text-zinc-800 hover:underline"
                  >
                    <span className={cn(iconTile, "mt-0.5")} aria-hidden>
                      <Mail />
                    </span>
                    <span className="break-all">{contactEmail}</span>
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-zinc-400">Not published on this page</p>
                )}
              </div>
            </div>
          </div>

          <div className="resort-landing-card lg:col-span-4">
            <div className="flex items-center gap-2">
              <span className={iconTile} aria-hidden>
                <Sparkles />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Amenities</p>
            </div>
            {chips.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {chips.map((label) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-zinc-50/80 px-3 py-1 text-xs font-medium text-zinc-800"
                  >
                    <Sparkles className="h-3 w-3 shrink-0 text-zinc-400" strokeWidth={2} aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-500">
                <p>No resort-wide amenities are published yet.</p>
                <ul className="space-y-1.5 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                  <li className="flex gap-2">
                    <span className="mt-0.5 text-zinc-400" aria-hidden>
                      ·
                    </span>
                    <span>Room cards below may still list in-room features for each accommodation type.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-0.5 text-zinc-400" aria-hidden>
                      ·
                    </span>
                    <span>The property can add shared facilities (pool, parking, Wi‑Fi, etc.) from their owner profile.</span>
                  </li>
                </ul>
                {roomsCount > 0 ? (
                  <a
                    href="#rooms"
                    className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 underline-offset-2 hover:text-navy hover:underline"
                  >
                    <span className={iconTile} aria-hidden>
                      <BedDouble />
                    </span>
                    Jump to rooms & inclusions
                  </a>
                ) : null}
              </div>
            )}
          </div>

          <div className="resort-landing-card lg:col-span-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className={iconTile} aria-hidden>
                  <CalendarDays />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Planning & policies</p>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-600">
                    Review cancellation rules before you pay the reservation fee. For date changes, contact the resort
                    directly using the details on this page.
                  </p>
                </div>
              </div>
              {policy ? (
                <details className="group w-full min-w-0 sm:max-w-md">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-2 text-sm font-semibold text-navy marker:content-none [&::-webkit-details-marker]:hidden">
                    <span>Cancellation policy</span>
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-zinc-500 transition group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="mt-3 whitespace-pre-line rounded-lg border border-zinc-100 bg-white/80 p-3 text-sm leading-relaxed text-zinc-600">
                    {policy}
                  </p>
                </details>
              ) : (
                <p className="w-full text-sm text-zinc-400 sm:max-w-xs sm:text-right">No cancellation policy text on file.</p>
              )}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
