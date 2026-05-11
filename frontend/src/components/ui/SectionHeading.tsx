import type { ReactNode } from "react";

export default function SectionHeading({
  title,
  subtitle,
  dark = false,
  centered = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  dark?: boolean;
  /** When true, title and subtitle are centered; subtitle keeps a max width and is horizontally centered. */
  centered?: boolean;
}) {
  return (
    <div className={`mb-8${centered ? " text-center" : ""}`}>
      <h2
        className={`font-heading text-3xl font-semibold md:text-4xl ${
          dark ? "text-white" : "text-zinc-900"
        }`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={`mt-2 max-w-2xl text-base ${centered ? "mx-auto" : ""} ${
            dark ? "text-white/70" : "text-zinc-600"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
