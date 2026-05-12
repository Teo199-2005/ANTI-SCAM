import Link from "next/link";

type Props = {
  heading: string;
  body: string | null;
  ctaLabel: string;
  ctaHref: string;
};

export function ResortAboutSection({ heading, body, ctaLabel, ctaHref }: Props) {
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
