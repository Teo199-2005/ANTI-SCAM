import { BrandWordmark } from "@/components/branding/BrandWordmark";
import Link from "next/link";
import { laravelPublicUrl } from "@/lib/publicAsset";

type Props = {
  resortName: string;
  logoUrl: string | null;
  bgPath: string | null;
  heading: string;
  subheading: string | null;
  ctaLabel: string;
  ctaHref: string;
};

export function ResortHeroSection({
  resortName,
  logoUrl,
  bgPath,
  heading,
  subheading,
  ctaLabel,
  ctaHref,
}: Props) {
  const bgAbs = bgPath ? laravelPublicUrl(bgPath) : "";
  const logoAbs = logoUrl ? laravelPublicUrl(logoUrl) : "";

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-24 text-center text-white"
      style={
        bgAbs
          ? {
              backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.55), rgba(15,23,42,0.75)), url(${bgAbs})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {
              backgroundImage:
                "linear-gradient(135deg, rgb(30 58 138 / 0.95), rgb(15 23 42 / 0.98))",
            }
      }
    >
      {!bgAbs && logoAbs ? (
        <div className="mb-8 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoAbs} alt="" className="max-h-full max-w-full object-contain p-2" />
        </div>
      ) : null}
      {bgAbs && logoAbs ? (
        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/15 shadow-lg backdrop-blur-md sm:h-24 sm:w-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoAbs} alt="" className="max-h-full max-w-full object-contain p-2" />
        </div>
      ) : null}
      <h1 className="max-w-3xl font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
        {heading}
      </h1>
      {subheading ? (
        <p className="mt-5 max-w-2xl text-base text-white/90 sm:text-lg">{subheading}</p>
      ) : null}
      <div className="mt-10">
        <Link
          href={ctaHref}
          className="inline-flex rounded-full bg-white px-8 py-3 text-sm font-semibold text-navy shadow-lg transition hover:bg-white/90"
        >
          {ctaLabel}
        </Link>
      </div>
      <div className="mt-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-sm">
        <BrandWordmark tone="onDark" size="xs" className="opacity-95" />
      </div>
      <p className="absolute bottom-6 left-0 right-0 text-xs text-white/50">{resortName}</p>
    </section>
  );
}
