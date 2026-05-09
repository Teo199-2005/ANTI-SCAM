import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, PhoneCall } from "lucide-react";
import Logo from "./Logo";
import PoweredByMark from "@/components/branding/PoweredByMark";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/blogs", label: "Blogs" },
  { href: "/contact", label: "Contact" },
];

const guestLinks = [
  { href: "/login", label: "Sign In" },
  { href: "/register", label: "Create Account" },
  { href: "/dashboard/client", label: "My Bookings" },
  { href: "/dashboard/client/profile", label: "My Profile" },
];

const featureBullets = [
  {
    title: "Actual Resort Verification",
    description:
      "Site inspection or live video verification for legitimacy and guest confidence.",
  },
  {
    title: "Automated Reservation System",
    description:
      "Real-time booking management with calendar synchronization and double-booking prevention.",
  },
  {
    title: "Dedicated Booking Website",
    description:
      "Each resort receives its own branded reservation page with automatic inquiry handling.",
  },
  {
    title: "Monthly Financial Reports",
    description:
      "Track reservations, revenue, occupancy, and booking performance with organized reports.",
  },
  {
    title: "Guest Trust & Protection",
    description: "Verified resort badges help guests identify legitimate staycation businesses.",
  },
  {
    title: "Philippine-Based Support",
    description: "Local support team for onboarding, verification, and operational assistance.",
  },
] as const;

const linkClass = "text-xs text-white/50 transition hover:text-white";

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-clOceanDeep">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[480px] -translate-x-1/2 rounded-full bg-white/8 blur-3xl" />

      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        {/* Brand — one row */}
        <div className="flex flex-col gap-3 border-b border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-5">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div>
              <h2 className="font-heading text-lg font-bold text-white sm:text-xl">Anti-Scam PH</h2>
              <p className="text-[11px] text-white/65 sm:text-xs">Verify. Check. Protect. · Philippines</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { href: "https://facebook.com", icon: <Facebook size={14} />, label: "Facebook" },
              { href: "https://instagram.com", icon: <Instagram size={14} />, label: "Instagram" },
              {
                href: "https://x.com",
                icon: (
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                ),
                label: "X / Twitter",
              },
            ].map(({ href, icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* About + links + map — single compact grid */}
        <div className="grid gap-6 py-5 lg:grid-cols-12 lg:gap-6 lg:py-6">
          <div className="lg:col-span-5">
            <h2 className="text-sm font-medium leading-snug text-white/90 md:text-[15px]">About</h2>
            <p className="mt-2 text-xs leading-relaxed text-white/45 md:text-[13px]">
              Anti-Scam PH helps Philippine resorts automate reservations, prevent double bookings, and build guest
              trust through verified booking systems and professional resort management tools.
            </p>
            <h3 className="sr-only">Feature highlights</h3>
            <ul className="mt-4 space-y-1 border-t border-white/5 pt-3">
              {featureBullets.map(({ title, description }) => (
                <li key={title} className="text-[11px] leading-snug text-white/35 md:text-xs">
                  <span className="text-white/55">{title}</span>
                  <span className="text-white/25"> · </span>
                  <span>{description}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:col-span-4">
            <div>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">Explore</h3>
              <ul className="space-y-1">
                {quickLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">My Account</h3>
              <ul className="space-y-1">
                {guestLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2">
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">Contact</h3>
              <ul className="space-y-1 text-xs text-white/50">
                <li>
                  <a href="mailto:support@antiscamph.com" className="inline-flex items-center gap-1.5 hover:text-white">
                    <Mail size={12} className="shrink-0 opacity-80" />
                    support@antiscamph.com
                  </a>
                </li>
                <li>
                  <a href="tel:09178744889" className="inline-flex items-center gap-1.5 hover:text-white">
                    <PhoneCall size={12} className="shrink-0 opacity-80" />
                    0917-874-4889
                  </a>
                </li>
                <li className="flex items-start gap-1.5">
                  <MapPin size={12} className="mt-0.5 shrink-0 opacity-80" />
                  Tagaytay City, Cavite, Philippines
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">Find Us</h3>
            <div className="overflow-hidden rounded-lg border border-white/10">
              <iframe
                title="Anti-Scam PH — location map"
                src="https://www.google.com/maps?q=Tagaytay%20City%20Cavite&z=14&output=embed"
                width="100%"
                height={120}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block"
              />
            </div>
            <Link
              href="/contact"
              className="mt-2 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-clOcean to-clTeal py-2 text-xs font-semibold text-white shadow-cl-btn transition hover:from-clOceanHover hover:to-clOcean"
            >
              Contact us →
            </Link>
          </div>
        </div>

        {/* Bottom — one tight band */}
        <div className="flex flex-col gap-2 border-t border-white/10 py-4 text-[11px] leading-snug text-white/35 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
            <span>© {year} Anti-Scam PH. All rights reserved.</span>
            <span className="hidden text-white/20 sm:inline" aria-hidden>
              |
            </span>
            <PoweredByMark compact showOperatorLogo={false} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/privacy" className="hover:text-white/60">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white/60">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-white/60">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
