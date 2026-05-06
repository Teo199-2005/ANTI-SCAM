import Link from "next/link";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  PhoneCall,
  Shield,
  Star,
} from "lucide-react";
import PageContainer from "./PageContainer";
import Logo from "./Logo";

const quickLinks = [
  { href: "/",        label: "Home"           },
  { href: "/resorts", label: "Browse Resorts" },
  { href: "/booking", label: "Booking Engine" },
  { href: "/about",   label: "About Us"       },
  { href: "/blogs",   label: "Blogs"          },
  { href: "/contact", label: "Contact"        },
];

const guestLinks = [
  { href: "/login",                    label: "Sign In"        },
  { href: "/register",                 label: "Create Account" },
  { href: "/dashboard/client",         label: "My Bookings"    },
  { href: "/dashboard/client/profile", label: "My Profile"     },
];

const trust = [
  { icon: Shield,    label: "Secure ₱500 reservation fee" },
  { icon: Star,      label: "Verified resort listings"     },
  { icon: PhoneCall, label: "PH-based guest support"       },
];

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-clOceanDeep">
      {/* Top edge glow — brand accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      {/* Ambient blob */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-white/8 blur-3xl" />

      <PageContainer className="px-4 md:px-8">

        {/* ── Top brand band ── */}
        <div className="flex flex-col items-start gap-6 border-b border-white/10 py-10 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo + tagline */}
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <div>
              <h2 className="font-heading text-2xl font-bold text-white">
                Anti-Scam PH
              </h2>
              <p className="mt-0.5 text-sm text-white/80">
                Anti-Scam PH · Verify. Check. Protect. · Philippines
              </p>
            </div>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            {[
              { href: "https://facebook.com",  icon: <Facebook  size={16} />, label: "Facebook"   },
              { href: "https://instagram.com", icon: <Instagram size={16} />, label: "Instagram"  },
              {
                href: "https://x.com",
                icon: (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
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
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/75 transition hover:border-white/35 hover:bg-white/10 hover:text-white"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">

          {/* Col 1 — About + trust signals */}
          <div className="lg:col-span-1">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white">
              About
            </h3>
            <p className="text-sm leading-7 text-white/55">
              Anti-Scam PH connects guests with verified luxury resorts
              across the Philippines through a seamless, secure booking experience.
            </p>
            <ul className="mt-6 space-y-3">
              {trust.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-white/55">
                  <Icon size={13} className="shrink-0 text-white/85" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2 — Quick links */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white">
              Explore
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-white"
                  >
                    <span className="h-px w-3 shrink-0 bg-white/35 transition-[width] group-hover:w-4 group-hover:bg-white" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Guest portal + contact */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white">
              My Account
            </h3>
            <ul className="space-y-2.5">
              {guestLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-white"
                  >
                    <span className="h-px w-3 shrink-0 bg-white/35 transition-[width] group-hover:w-4 group-hover:bg-white" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="mb-4 mt-8 text-xs font-semibold uppercase tracking-widest text-white">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-white/55">
              <li>
                <a
                  href="mailto:support@antiscamph.com"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <Mail size={13} className="shrink-0 text-white/85" />
                  support@antiscamph.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+639171234567"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <PhoneCall size={13} className="shrink-0 text-white/85" />
                  +63 917 123 4567
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0 text-white/85" />
                BGC, Taguig City, Metro Manila
              </li>
            </ul>
          </div>

          {/* Col 4 — Map + CTA */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white">
              Find Us
            </h3>
            <div className="overflow-hidden rounded-2xl border border-white/10 shadow-lg">
              <iframe
                title="Anti-Scam PH — location map"
                src="https://www.google.com/maps?q=Bonifacio%20Global%20City%20Taguig&z=14&output=embed"
                width="100%"
                height="200"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block"
              />
            </div>

            <Link
              href="/booking"
              className="mt-5 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-clOcean to-clTeal py-2.5 text-sm font-semibold text-white shadow-cl-btn transition hover:from-clOceanHover hover:to-clOcean active:scale-[0.985]"
            >
              Book a Stay →
            </Link>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-white/35 sm:flex-row">
          <p>© {year} Anti-Scam PH. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="transition hover:text-white/70">Privacy Policy</Link>
            <Link href="/terms"   className="transition hover:text-white/70">Terms of Service</Link>
            <Link href="/contact" className="transition hover:text-white/70">Support</Link>
          </div>
        </div>

      </PageContainer>
    </footer>
  );
}
