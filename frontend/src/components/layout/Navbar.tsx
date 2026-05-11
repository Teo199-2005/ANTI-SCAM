"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, LogIn, Menu, Store, X } from "lucide-react";
import PageContainer from "./PageContainer";
import Logo from "./Logo";
import { NavBrandWordmark } from "./NavBrandWordmark";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthMarketingNavOverlayPath, isAuthSplitShellPath } from "@/lib/authMarketingNavOverlay";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useEffect, useRef, useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/verify-resort", label: "Verify Resort" },
  { href: "/about", label: "About" },
  { href: "/blogs", label: "Blogs" },
  { href: "/contact", label: "Contact" },
] as const;

function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop row — hero overlay: unboxed spacing; Home / Verify as pills; rest as plain text. */
function desktopNavLinkClass(pathname: string, href: string, navOverMedia: boolean) {
  const active = isNavLinkActive(pathname, href);
  if (!navOverMedia) {
    return cn(
      "whitespace-nowrap rounded-full px-3 py-2.5 font-nav text-[13px] font-extrabold uppercase tracking-[0.12em] transition-all duration-150 xl:px-4 xl:text-sm xl:tracking-[0.14em]",
      active ? "bg-navy/[0.07] text-navy shadow-sm" : "text-zinc-500 hover:bg-clSeafoam/50 hover:text-navy"
    );
  }
  const base =
    "whitespace-nowrap font-nav text-[13px] font-extrabold uppercase tracking-[0.12em] transition-colors duration-150 xl:text-sm xl:tracking-[0.14em]";
  if (href === "/") {
    return cn(
      base,
      "rounded-full px-5 py-2.5",
      active ? "bg-navy text-white" : "text-navy hover:bg-white/20"
    );
  }
  if (href === "/verify-resort") {
    return cn(
      base,
      "inline-flex items-center gap-2 rounded-full border-0 px-4 py-2.5 backdrop-blur-md",
      active ? "bg-white/50 text-navy" : "bg-white/35 text-navy/95 hover:bg-white/45"
    );
  }
  const authSplitNav = isAuthSplitShellPath(pathname);
  const plainMarketingHref =
    href === "/about" || href === "/blogs" || href === "/contact";
  const isRegisterPath =
    pathname === "/register" || pathname.startsWith("/register/");
  // Register uses centered form (no hero photo); navy links match Home / Verify.
  if (authSplitNav && plainMarketingHref && !isRegisterPath) {
    return cn(
      base,
      "rounded-md px-2.5 py-2.5 xl:px-3",
      active
        ? "text-white underline decoration-white/45 decoration-2 underline-offset-[5px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
        : "text-white/90 hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
    );
  }
  return cn(
    base,
    "rounded-md px-2.5 py-2.5 xl:px-3",
    active ? "text-navy" : "text-navy/85 hover:text-navy",
    active && "underline decoration-navy/35 decoration-2 underline-offset-[5px]"
  );
}

export default function Navbar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const navOverMedia = isAuthMarketingNavOverlayPath(pathname);
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
          "transition-[box-shadow,background-color] duration-200",
          navOverMedia
            ? "pointer-events-none fixed inset-x-0 top-0 z-50 border-0 bg-transparent shadow-none"
            : "sticky top-0 z-40 max-lg:border-b-0 max-lg:bg-transparent max-lg:shadow-none max-lg:backdrop-blur-none lg:border-b lg:border-navy/10 lg:bg-white/90 lg:backdrop-blur-xl lg:backdrop-saturate-150",
          !navOverMedia && scrolled ? "shadow-[0_2px_20px_rgba(13,30,66,0.08)]" : "shadow-none"
        )}
      >
        {navOverMedia ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[5rem] bg-gradient-to-b from-white/30 via-white/[0.08] to-transparent backdrop-blur-md backdrop-saturate-150 [mask-image:linear-gradient(to_bottom,black_0%,black_45%,transparent_100%)]"
            aria-hidden
          />
        ) : null}
        <PageContainer
          className={cn(
            "relative z-[1] max-lg:mx-2.5 max-lg:max-w-[calc(100%-1.25rem)] max-lg:sm:mx-4 max-lg:sm:max-w-[calc(100%-2rem)] px-3 sm:px-5 md:px-8",
            "max-lg:flex max-lg:flex-col max-lg:gap-0 max-lg:pb-2.5 max-lg:pt-[max(0.35rem,env(safe-area-inset-top))]",
            "lg:flex lg:flex-row lg:items-center lg:gap-10 lg:pb-3.5 lg:pt-[max(0.35rem,env(safe-area-inset-top))] xl:gap-14",
            navOverMedia
              ? "pointer-events-auto lg:min-h-[4.6rem]"
              : "max-lg:rounded-b-[1.35rem] max-lg:border max-lg:border-navy/10 max-lg:bg-gradient-to-b max-lg:from-white max-lg:to-[#f6f8fc] max-lg:shadow-[0_14px_36px_-22px_rgba(13,30,66,0.18)] max-lg:ring-1 max-lg:ring-white/80 lg:h-[5.15rem] lg:min-h-[5.15rem] lg:border-0 lg:bg-transparent lg:bg-none lg:from-transparent lg:to-transparent lg:shadow-none lg:ring-0"
          )}
        >
          {/* ── Mobile (<lg): single bar; site links only in drawer (hamburger) ── */}
          <div className="w-full min-w-0 lg:hidden">
            <div className="flex w-full items-center justify-between gap-2 py-0.5">
              {/* Mobile: logo + wordmark only — Log in / Register / Dashboard live in the menu drawer */}
              <Link
                href="/"
                className={cn(
                  "group flex min-w-0 flex-1 items-center gap-2",
                  navOverMedia && "drop-shadow-[0_1px_2px_rgba(255,255,255,0.92)]"
                )}
              >
                <Logo
                  size="sm"
                  className={cn(
                    "shrink-0 transition",
                    navOverMedia ? "ring-0" : "ring-1 ring-navy/10 group-hover:ring-navy/20"
                  )}
                />
                <NavBrandWordmark size="header" className="min-w-0 truncate" />
              </Link>
              <button
                type="button"
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
                suppressHydrationWarning
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy transition [touch-action:manipulation]",
                  navOverMedia
                    ? "bg-white/45 backdrop-blur-md hover:bg-white/60"
                    : "border border-navy/12 bg-white shadow-sm hover:bg-clSeafoam/60"
                )}
              >
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* ── Desktop row (lg+) ── */}
          <div
            className={cn(
              "hidden h-full min-h-0 w-full min-w-0 flex-1 items-center justify-between gap-6 lg:flex xl:gap-10",
              navOverMedia ? "lg:min-h-[4.6rem]" : "lg:min-h-[5.15rem]"
            )}
          >
            <Link
              href="/"
              className={cn(
                "group flex min-w-0 shrink-0 origin-left scale-[1.15] items-center gap-2.5 sm:gap-3",
                navOverMedia && "drop-shadow-[0_1px_2px_rgba(255,255,255,0.92)]"
              )}
            >
              <Logo
                size="md"
                className={cn(
                  "transition",
                  navOverMedia ? "ring-0" : "ring-1 ring-navy/10 group-hover:ring-navy/20"
                )}
              />
              <NavBrandWordmark size="header" className="min-w-0" />
            </Link>

            <nav
              className={cn(
                "flex flex-1 items-center justify-center",
                navOverMedia ? "gap-5 xl:gap-7" : "gap-0.5 xl:gap-1"
              )}
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={desktopNavLinkClass(pathname, link.href, navOverMedia)}
                >
                  {navOverMedia && link.href === "/verify-resort" ? (
                    <>
                      <BadgeCheck size={16} className="shrink-0 text-clCoral" aria-hidden />
                      {link.label}
                    </>
                  ) : (
                    link.label
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2.5">
              {!loading && user ? (
                <>
                  <span
                    className="max-w-[150px] truncate text-[15px] font-medium text-clOcean"
                    title={user.email}
                  >
                    {user.name}
                  </span>
                  <Link
                    href="/dashboard"
                    className={cn(
                      "inline-flex whitespace-nowrap rounded-full px-5 py-2 text-[15px] font-medium text-clOcean transition",
                      navOverMedia
                        ? "border-0 bg-white/40 shadow-none backdrop-blur-md hover:bg-white/50"
                        : "border border-clSeafoam bg-white/60 shadow-sm backdrop-blur-md hover:bg-clSeafoam/70 hover:text-clOcean"
                    )}
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-nav text-[13px] font-bold uppercase tracking-wide text-navy transition sm:px-5 sm:text-sm",
                      navOverMedia
                        ? "border-0 bg-white/40 shadow-none backdrop-blur-md hover:bg-white/50"
                        : "border border-navy/15 bg-white shadow-sm hover:border-navy/25 hover:bg-clSeafoam/40"
                    )}
                  >
                    <LogIn size={17} className="text-navy/80" aria-hidden />
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accentOrange via-clCoral to-accentOrange px-4 py-2.5 font-nav text-[13px] font-extrabold uppercase tracking-wide text-navy transition hover:from-accentOrangeDark hover:via-clCoralDark hover:to-accentOrangeDark sm:px-5 sm:text-sm",
                      navOverMedia ? "shadow-none" : "shadow-dash-accent"
                    )}
                  >
                    <Store size={17} className="shrink-0 text-navy" aria-hidden />
                    Register your resort
                  </Link>
                </>
              )}
            </div>
          </div>
        </PageContainer>
      </header>

      {/* ── Mobile drawer ── */}
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-[100] bg-clOceanDeep/30 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
            drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />

        {/* Panel */}
        <aside
          ref={drawerPanelRef}
          className={cn(
            "fixed right-0 top-0 z-[100] flex h-full w-[min(100%,22rem)] max-w-[calc(100vw-0.5rem)] flex-col border-l border-navy/10 bg-white/[0.97] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-[-12px_0_40px_-16px_rgba(13,30,66,0.2)] backdrop-blur-2xl transition-transform duration-200 ease-in-out motion-reduce:transition-none sm:w-80 lg:hidden",
            drawerOpen ? "translate-x-0" : "translate-x-full"
          )}
          aria-modal="true"
          role="dialog"
          aria-label="Menu and account"
          {...(!drawerOpen ? { inert: true } : {})}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-navy/10 pb-4">
            <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
              <Logo size="md" />
              <NavBrandWordmark size="drawer" />
            </Link>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setDrawerOpen(false)}
              suppressHydrationWarning
              className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full border border-clSeafoam bg-white/80 text-clOcean backdrop-blur-md [touch-action:manipulation] hover:bg-clSeafoam/70"
            >
              <X size={20} />
            </button>
          </div>

          {/* Account first — top bar is logo + menu only on small screens */}
          <div className="mb-5 shrink-0 space-y-2.5 border-b border-navy/10 pb-5">
            <p
              id="drawer-account-heading"
              className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-zinc-400"
            >
              Account
            </p>
            {loading ? (
              <p className="text-sm text-zinc-400">Loading…</p>
            ) : user ? (
              <>
                <p className="truncate text-[13px] font-semibold text-zinc-500">{user.email}</p>
                <Link
                  href="/dashboard"
                  onClick={() => setDrawerOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl border border-clSeafoam bg-white/60 py-3 text-[15px] font-medium text-clOcean backdrop-blur-md hover:bg-clSeafoam/60"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="flex w-full items-center justify-center gap-2.5 rounded-full border border-navy/15 bg-white py-3.5 font-nav text-[15px] font-bold uppercase tracking-wide text-navy shadow-sm hover:bg-clSeafoam/50"
                >
                  <LogIn size={18} className="text-navy/80" aria-hidden />
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setDrawerOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accentOrange via-clCoral to-accentOrange py-3.5 font-nav text-[15px] font-extrabold uppercase tracking-wide text-navy shadow-dash-accent hover:from-accentOrangeDark hover:via-clCoralDark hover:to-accentOrangeDark"
                >
                  <Store size={18} className="shrink-0 text-navy" aria-hidden />
                  Register your resort
                </Link>
              </>
            )}
          </div>

          <p id="drawer-nav-heading" className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">
            Site
          </p>
          <nav
            className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pb-2"
            aria-labelledby="drawer-nav-heading"
          >
            {navLinks.map((link) => {
              const active = isNavLinkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex min-h-[3.25rem] items-center gap-3 rounded-xl px-4 py-3.5 font-nav text-base font-extrabold uppercase tracking-wide transition-all duration-150 active:scale-[0.99]",
                    active
                      ? "bg-navy/[0.1] text-navy ring-1 ring-navy/10"
                      : "text-zinc-700 hover:bg-clSeafoam/55 hover:text-navy"
                  )}
                >
                  {link.href === "/verify-resort" ? (
                    <BadgeCheck size={20} className="shrink-0 text-clCoral" aria-hidden />
                  ) : null}
                  <span className="min-w-0 leading-snug">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
      </>
    </>
  );
}
