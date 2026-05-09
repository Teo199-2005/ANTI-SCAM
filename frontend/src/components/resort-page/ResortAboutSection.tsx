import Link from "next/link";
import { laravelPublicUrl } from "@/lib/publicAsset";

type Props = {
  heading: string;
  body: string | null;
  gallery: string[];
  ctaLabel: string;
  ctaHref: string;
};

export function ResortAboutSection({ heading, body, gallery, ctaLabel, ctaHref }: Props) {
  const urls = gallery.map((p) => laravelPublicUrl(p)).filter(Boolean);

  return (
    <section id="about" className="bg-zinc-50 px-6 py-20 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-3xl font-bold text-navy sm:text-4xl">{heading}</h2>
        {body ? (
          <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-zinc-600 sm:text-lg">
            {body}
          </p>
        ) : (
          <p className="mt-6 text-zinc-400">More details coming soon.</p>
        )}

        {urls.length > 0 ? (
          <div
            className={`mt-12 grid gap-4 ${
              urls.length === 1
                ? "grid-cols-1"
                : urls.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {urls.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="aspect-[4/3] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center text-sm text-zinc-400">
            Gallery images can be added from your resort dashboard.
          </div>
        )}

        <div className="mt-12 flex justify-center">
          <Link
            href={ctaHref}
            className="inline-flex rounded-full bg-navy px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-navy/90"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
