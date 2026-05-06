export default function SectionHeading({
  title,
  subtitle,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div className="mb-8">
      <h2
        className={`font-heading text-3xl font-semibold md:text-4xl ${
          dark ? "text-white" : "text-zinc-900"
        }`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={`mt-2 max-w-2xl text-base ${
            dark ? "text-white/70" : "text-zinc-600"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
