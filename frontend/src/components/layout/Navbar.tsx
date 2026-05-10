"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, Menu, UserPlus, X } from "lucide-react";
import PageContainer from "./PageContainer";
import Logo from "./Logo";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useEffect, useRef, useState } from "react";

const navLinks = [
  { href: "/",        label: "Home"    },
  { href: "/about",   label: "About"   },
  { href: "/blogs",   label: "Blogs"   },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerPanelRef = useRef<HTMLElement | null>(null);
  useFocusTrap(drawerOpen, drawerPanelRef);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Subtle shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-clSeafoam/60 bg-clSand/85 backdrop-blur-xl backdrop-saturate-150 transition-shadow duration-200",
          scrolled ? "shadow-[0_2px_16px_rgba(13,30,66,0.10)]" : "shadow-none"
        )}
      >
        <PageContainer className="px-4 md:px-8">
          <div className="flex h-16 items-center gap-4 lg:h-[4.5rem]">

            {/* ── ZONE 1 · Logo + brand ── */}
            <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
              <Logo size="md" />
              <span className="hidden whitespace-nowrap font-heading text-lg font-bold leading-tight text-clOcean sm:block transition-colors duration-150 group-hover:text-clTeal">
                Anti-Scam PH
              </span>
            </Link>

            {/* ── ZONE 2 · Nav links (desktop) ── */}
            <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-clOcean/10 text-clOcean font-semibold"
                        : "text-zinc-600 hover:bg-clSeafoam/60 hover:text-clOcean"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex-1 lg:hidden" />

            {/* ── ZONE 3 · Auth + CTA ── */}
            <div className="flex shrink-0 items-center gap-2">
              {!loading && user ? (
                <>
                  <span
                    className="hidden max-w-[130px] truncate text-sm font-medium text-clOcean md:inline"
                    title={user.email}
                  >
                    {user.name}
                  </span>
                  <Link
                    href="/dashboard"
                    className="inline-flex whitespace-nowrap rounded-full border border-clSeafoam bg-white/60 px-4 py-1.5 text-sm font-medium text-clOcean shadow-sm backdrop-blur-md transition hover:bg-clSeafoam/70 hover:text-clOcean"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 rounded-full border border-clOcean/20 bg-white/60 px-4 py-1.5 text-sm font-medium text-clOcean shadow-sm backdrop-blur-md transition hover:bg-clSeafoam/60 hover:border-clTeal/40"
                  >
                    <LogIn size={14} />
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 rounded-full border border-clOcean/25 bg-clOcean/8 px-4 py-1.5 text-sm font-semibold text-clOcean shadow-sm backdrop-blur-md transition hover:bg-clOcean/15"
                  >
                    <UserPlus size={14} />
                    Register
                  </Link>
                </>
              )}

              {/* Hamburger */}
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-clSeafoam bg-white/50 text-clOcean shadow-sm backdrop-blur-md transition hover:bg-clSeafoam/70 [touch-action:manipulation] lg:hidden"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </PageContainer>
      </header>

      {/* ── Mobile drawer ── */}
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-50 bg-clOceanDeep/30 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
            drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />

        {/* Panel */}
        <aside
          ref={drawerPanelRef}
          className={cn(
            "fixed right-0 top-0 z-50 flex h-full w-72 flex-col border-l border-clSeafoam/50 bg-clSand/95 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] backdrop-blur-2xl transition-transform duration-200 ease-in-out motion-reduce:transition-none lg:hidden",
            drawerOpen ? "translate-x-0" : "translate-x-full"
          )}
          aria-modal="true"
          role="dialog"
          aria-label="Navigation menu"
          {...(!drawerOpen ? { inert: true } : {})}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
              <Logo size="md" />
              <span className="font-heading text-lg font-bold text-clOcean">Anti-Scam PH</span>
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-clSeafoam bg-white/60 text-clOcean backdrop-blur-md [touch-action:manipulation] hover:bg-clSeafoam/70 sm:min-h-10 sm:min-w-10"
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 space-y-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex items-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-clOcean/10 text-clOcean font-semibold"
                      : "text-zinc-700 hover:bg-clSeafoam/50 hover:text-clOcean"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Auth section */}
          <div className="mt-6 space-y-2 border-t border-clSeafoam/60 pt-5">
            {user ? (
              <>
                <p className="truncate px-1 text-xs font-semibold text-zinc-500">{user.email}</p>
                <Link
                  href="/dashboard"
                  onClick={() => setDrawerOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl border border-clSeafoam bg-white/60 py-2.5 text-sm font-medium text-clOcean backdrop-blur-md hover:bg-clSeafoam/60"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-clSeafoam bg-white/60 py-2.5 text-sm font-medium text-clOcean backdrop-blur-md hover:bg-clSeafoam/60"
                >
                  <LogIn size={14} />
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setDrawerOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-clOcean/20 bg-clOcean/8 py-2.5 text-sm font-semibold text-clOcean backdrop-blur-md hover:bg-clOcean/15"
                >
                  <UserPlus size={14} />
                  Register
                </Link>
              </>
            )}
          </div>
        </aside>
      </>
    </>
  );
}
