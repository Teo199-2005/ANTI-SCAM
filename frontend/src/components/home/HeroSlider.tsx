"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Award,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  MessageSquareOff,
  Settings2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Slide = {
  id: number;
  icon: React.ElementType;
  eyebrow: string;
  headline: string;
  sub: string;
  cta: string;
  ctaHref: string;
  /** tailwind gradient for the icon bubble */
  accent: string;
  /** blob color for bg ambient light */
  blob: string;
};

const slides: Slide[] = [
  {
    id: 1,
    icon: Settings2,
    eyebrow: "Property Management",
    headline: "Simplify your\nproperty management",
    sub: "One dashboard for rooms, reservations, payments, and guest communications — no spreadsheets needed.",
    cta: "Get started",
    ctaHref: "/register",
    accent: "from-clSeafoam/40 to-clTeal/20",
    blob: "bg-clTeal",
  },
  {
    id: 2,
    icon: Award,
    eyebrow: "Business Legitimacy",
    headline: "Legitimize your resort\nor staycation business",
    sub: "Get a branded booking page, verified listings, and a paper trail that builds guest trust from day one.",
    cta: "List your resort",
    ctaHref: "/register",
    accent: "from-amber-400/30 to-orange-500/20",
    blob: "bg-amber-400",
  },
  {
    id: 3,
    icon: CalendarCheck2,
    eyebrow: "Booking Conflicts",
    headline: "No more\ndouble bookings",
    sub: "Real-time room locking ensures every reservation is unique. When a room is booked, it's off the calendar instantly.",
    cta: "See how it works",
    ctaHref: "/booking",
    accent: "from-emerald-400/30 to-teal-500/20",
    blob: "bg-emerald-400",
  },
  {
    id: 4,
    icon: Zap,
    eyebrow: "Seamless Experience",
    headline: "Easy booking,\nfor everyone",
    sub: "Guests reserve in minutes. Owners approve without lifting a finger. The whole flow is automated end-to-end.",
    cta: "Try the booking engine",
    ctaHref: "/booking",
    accent: "from-clCoral/30 to-clCoralDark/20",
    blob: "bg-clCoral",
  },
  {
    id: 5,
    icon: MessageSquareOff,
    eyebrow: "Inquiry Fatigue",
    headline: "No more annoying\nredundant inquiries",
    sub: "Availability, pricing, and policies are live on your page. Guests self-serve — your inbox stays clean.",
    cta: "Explore features",
    ctaHref: "/about",
    accent: "from-violet-400/30 to-purple-500/20",
    blob: "bg-violet-400",
  },
];

const BG =
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1600&q=80&auto=format&fit=crop";

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const goTo = useCallback(
    (idx: number) => {
      if (animating) return;
      setAnimating(true);
      setTimeout(() => {
        setCurrent(idx);
        setAnimating(false);
      }, 350);
    },
    [animating]
  );

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    timerRef.current = setTimeout(next, 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, next, prefersReducedMotion]);

  const slide = slides[current];

  return (
    <section className="relative min-h-[88vh] overflow-hidden">
      {/* Background */}
      <Image src={BG} alt="Resort aerial view" fill priority className="object-cover" sizes="100vw" />

      {/* Deep navy overlay — Anti-Scam PH brand dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-clOceanDeep/85 via-clOcean/65 to-clTeal/45" />

      {/* Ambient blob light */}
      <div
        className={cn(
          "pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full opacity-25 blur-3xl transition-colors duration-700",
          slide.blob
        )}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-[88vh] flex-col items-center justify-center section-padding">

        {/* Eyebrow */}
        <div
          className={cn(
            "mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/85 backdrop-blur-md transition-all duration-500",
            animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}
        >
          <slide.icon size={13} aria-hidden />
          {slide.eyebrow}
        </div>

        {/* Headline */}
        <h2
          className={cn(
            "max-w-3xl text-center font-heading text-4xl font-bold leading-tight text-white drop-shadow-lg transition-all duration-500 sm:text-5xl md:text-6xl lg:text-7xl",
            animating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          )}
          style={{ whiteSpace: "pre-line" }}
        >
          {slide.headline}
        </h2>

        {/* Sub */}
        <p
          className={cn(
            "mt-5 max-w-xl text-center text-base leading-relaxed text-white/75 drop-shadow transition-all duration-500 md:text-lg",
            animating ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
          )}
        >
          {slide.sub}
        </p>

        {/* CTA row */}
        <div
          className={cn(
            "mt-8 flex items-center gap-4 transition-all duration-500",
            animating ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
          )}
        >
          <Link
            href={slide.ctaHref}
            className="inline-flex items-center rounded-full bg-white px-7 py-3 text-sm font-bold text-clOcean shadow-xl transition hover:bg-clSand hover:shadow-2xl active:scale-[0.985]"
          >
            {slide.cta}
          </Link>
          <Link href="/resorts" className="cl-btn-ghost-dark">
            Browse Resorts
          </Link>
        </div>

        {/* Slide navigation */}
        <div className="mt-14 flex items-center gap-6">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={prev}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-2.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={cn(
                  "rounded-full transition-all duration-500",
                  i === current
                    ? "h-2.5 w-8 bg-white shadow-md"
                    : "h-2.5 w-2.5 bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Next slide"
            onClick={next}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-110 active:scale-95"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <p className="mt-4 text-xs font-medium text-white/40 tabular-nums">
          {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </p>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <div
          key={current}
          className="h-full bg-white/50 animate-progress-bar"
          style={{ animationDuration: "5s", animationTimingFunction: "linear" }}
        />
      </div>
    </section>
  );
}
