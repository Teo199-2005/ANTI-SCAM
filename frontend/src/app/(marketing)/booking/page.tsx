import PageContainer from "@/components/layout/PageContainer";
import Card from "@/components/ui/Card";
import BookingEngine from "@/components/booking/BookingEngine";
import Image from "next/image";
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  CreditCard,
  Headset,
  KeyRound,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react";

const bookingSteps = [
  "Pick dates on a verified resort listing",
  "Live availability check — no phantom or double-sold rooms",
  "Confirm details; everything stays on record in one flow",
  "Pay the official ₱500 reservation fee only through this platform",
  "Get confirmation you can verify with the resort — your paper trail",
];

const panelClass =
  "rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-[0_16px_36px_-16px_rgba(13,30,66,0.12)] md:p-8";

export default function BookingPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(13,30,66,0.07),transparent_50%)]"
        aria-hidden
      />
      <PageContainer className="section-padding relative">
        <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_24px_48px_-22px_rgba(13,30,66,0.32)]">
          <Image
            src="/poster1.png"
            alt="Anti-Scam PH safe booking poster"
            width={1823}
            height={863}
            priority
            className="h-auto w-full object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 95vw, 1200px"
          />
        </section>

        <header className="mb-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-clOceanDeep via-clOcean to-clOceanDeep px-6 py-10 text-white shadow-[0_28px_56px_-20px_rgba(13,30,66,0.45)] md:px-10 md:py-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">Anti-Scam PH</p>
          <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight md:text-4xl">
            Book with verify · check · protect
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/78">
            Our booking flow is built for trust: real-time availability, a clear ₱500 reservation path, and a record you
            can show the resort — so you&apos;re not paying strangers off-platform or chasing unverifiable &quot;deals.&quot;
          </p>
          <p className="mt-4 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-white/85">
            <Shield className="inline h-4 w-4 shrink-0 text-clCoral" aria-hidden />
            <span>Verified listings · On-platform fee · Documented confirmation</span>
          </p>
        </header>

        <BookingEngine />

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className={`${panelClass} border-l-4 border-l-clOcean`}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-clOcean/10 text-clOcean">
              <ShieldCheck size={22} strokeWidth={2} />
            </div>
            <h2 className="font-heading text-2xl font-semibold text-zinc-900">Stop double-booking scams</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              The same room can&apos;t be &quot;sold&quot; twice on our watch: live availability and a timed lock mean
              your dates are held only while you complete the official reservation fee — cutting off a common resort
              booking scam pattern.
            </p>
          </div>

          <div className={`${panelClass} border-l-4 border-l-clCoral`}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-clCoral/15 text-clCoralDark">
              <Zap size={22} strokeWidth={2} />
            </div>
            <h2 className="font-heading text-2xl font-semibold text-zinc-900">Fast, transparent, on Anti-Scam PH</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              See what&apos;s actually open, confirm in one guided path, and pay the ₱500 reservation fee here — not via
              random transfers or unofficial &quot;agents.&quot; Fewer surprises, less inbox noise, more confidence for
              guests and honest operators.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-clOcean">
              <Clock3 size={14} strokeWidth={2} />
              Typical flow: under 3 minutes
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Card className="!rounded-2xl !border-zinc-200/90 !bg-white !shadow-[0_16px_36px_-16px_rgba(13,30,66,0.12)] !backdrop-blur-none md:!p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-clOcean/10 text-clOcean">
              <CalendarDays size={22} strokeWidth={2} />
            </div>
            <h2 className="mt-5 font-heading text-2xl font-semibold text-zinc-900">How we protect your booking</h2>
            <ul className="mt-5 space-y-3">
              {bookingSteps.map((step) => (
                <li key={step} className="flex items-start gap-3 text-sm text-zinc-600">
                  <BadgeCheck size={16} className="mt-0.5 shrink-0 text-clOcean" strokeWidth={2} />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="!rounded-2xl !border-zinc-200/90 !bg-white !shadow-[0_16px_36px_-16px_rgba(13,30,66,0.12)] !backdrop-blur-none md:!p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-clOcean/10 text-clOcean">
              <Shield size={22} strokeWidth={2} />
            </div>
            <h2 className="mt-5 font-heading text-2xl font-semibold text-zinc-900">Trust snapshot (Anti-Scam PH)</h2>
            <div className="mt-5 space-y-4 text-sm text-zinc-600">
              <p className="flex items-start gap-3">
                <CreditCard size={16} className="mt-0.5 shrink-0 text-clOcean" />
                ₱500 reservation fee paid <span className="font-medium text-zinc-800">only</span> through this
                platform — creates a clear, verifiable trail.
              </p>
              <p className="flex items-start gap-3">
                <BadgeCheck size={16} className="mt-0.5 shrink-0 text-clOcean" />
                Remaining balance is settled directly with the resort after you have legitimate confirmation.
              </p>
              <p className="flex items-start gap-3">
                <KeyRound size={16} className="mt-0.5 shrink-0 text-clOcean" />
                Room lock is time-limited during checkout so slots aren&apos;t held hostage or duplicated.
              </p>
              <p className="flex items-start gap-3">
                <Headset size={16} className="mt-0.5 shrink-0 text-clOcean" />
                Suspect a scam or a fake listing? Reach out — we&apos;re here to help guests and honest resorts.
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-clOceanDeep to-clOcean px-6 py-10 text-center shadow-[0_24px_48px_-18px_rgba(13,30,66,0.35)] md:px-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/85 backdrop-blur-sm">
            <Headset size={14} />
            Anti-Scam PH support
          </div>
          <h2 className="font-heading text-2xl font-semibold text-white md:text-3xl">Verify before you pay anyone</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
            Booking questions or something that doesn&apos;t feel right? Call{" "}
            <a
              href="tel:+639171234567"
              className="font-semibold text-white underline decoration-white/40 underline-offset-2 transition hover:decoration-white"
            >
              +63 917 123 4567
            </a>{" "}
            or email{" "}
            <a
              href="mailto:support@antiscamph.com"
              className="font-semibold text-white underline decoration-white/40 underline-offset-2 transition hover:decoration-white"
            >
              support@antiscamph.com
            </a>
            . We&apos;d rather you check with us than lose money to an impersonator.
          </p>
        </div>
      </PageContainer>
    </div>
  );
}
