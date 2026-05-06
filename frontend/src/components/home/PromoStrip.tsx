export default function PromoStrip({ dark = false }: { dark?: boolean }) {
  return (
    <section
      className={`py-3 text-center text-sm font-semibold shadow-sm backdrop-blur-md backdrop-saturate-150 ${
        dark ? "border-y border-white/15 bg-zinc-600/85 text-white" : "border-y border-white/20 bg-slateBlue/85 text-white"
      }`}
    >
      Book now for 20% off weekday luxury suites - limited seasonal offer.
    </section>
  );
}
