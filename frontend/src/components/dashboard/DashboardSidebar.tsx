"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cn, formatRoleLabel } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Eye,
  FileText,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  MessageSquare,
  Bell,
  Heart,
  Landmark,
  Percent,
  Plus,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  Video,
  Webhook,
  X,
} from "lucide-react";
import { BrandWordmark } from "@/components/branding/BrandWordmark";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getOwnerLandingPage } from "@/lib/api/landingPage";
import { getResortVerificationStats } from "@/lib/api/adminResortVerification";
import { isBusinessProPlan } from "@/lib/subscriptionPlans";
import Logo from "@/components/layout/Logo";
import { laravelPublicUrl } from "@/lib/publicAsset";

type SidebarProps = { open: boolean; onClose: () => void };

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };


const adminGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/dashboard/admin/users", label: "Users", icon: Users },
      { href: "/dashboard/admin/marketing-monitor", label: "Marketing partners", icon: Activity },
      { href: "/dashboard/admin/resorts", label: "Resorts", icon: Building2 },
      { href: "/dashboard/admin/resort-verifications", label: "Resort verification", icon: ShieldCheck },
      { href: "/dashboard/admin/clients", label: "Clients", icon: UserRound },
      { href: "/dashboard/admin/landing-embed", label: "Landing intro video", icon: Video },
      { href: "/dashboard/admin/reservations", label: "Reservations", icon: CalendarDays },
      { href: "/dashboard/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/dashboard/admin/finance", label: "Finance & payouts", icon: Landmark },
      { href: "/dashboard/admin/suspensions", label: "Suspensions", icon: AlertTriangle },
      { href: "/dashboard/admin/reviews", label: "Reviews", icon: MessageSquare },
      { href: "/dashboard/admin/visitors", label: "Visitors", icon: Eye },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/admin/onboard",     label: "Onboard Resort",   icon: Plus },
      { href: "/dashboard/admin/xendit-logs", label: "Payment Logs",     icon: Webhook },
      { href: "/dashboard/admin/audit-logs",  label: "Audit Logs",       icon: FileText },
    ],
  },
];

const marketingGroups: NavGroup[] = [
  {
    label: "Marketing",
    items: [
      { href: "/dashboard/marketing", label: "Overview", icon: TrendingUp, exact: true },
      { href: "/dashboard/marketing/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/marketing/clients", label: "Clients", icon: UserRound },
      { href: "/dashboard/marketing/referrals", label: "Referrals & links", icon: Link2 },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/dashboard/marketing/profile", label: "Profile", icon: Settings }],
  },
];

const staffGroups: NavGroup[] = [
  {
    label: "Staff",
    items: [
      { href: "/dashboard/staff", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/staff/reservations", label: "Reservations", icon: CalendarDays },
      { href: "/dashboard/staff/notes", label: "My Notes", icon: MessageSquare },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/dashboard/staff/profile", label: "Profile", icon: Settings }],
  },
];

const resortOwnerGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard/resort", label: "Overview", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/dashboard/resort/rooms",         label: "Rooms",         icon: ListChecks },
      { href: "/dashboard/resort/reservations",  label: "Reservations",  icon: CalendarDays },
      { href: "/dashboard/resort/guests",        label: "Guests",        icon: Users },
      { href: "/dashboard/resort/discounts",     label: "Discounts",     icon: Percent },
    ],
  },
  {
    label: "Revenue",
    items: [
      { href: "/dashboard/resort/revenue",       label: "Revenue Report", icon: TrendingUp },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/resort/profile", label: "Profile", icon: Settings },
    ],
  },
];

const clientGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard/client", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/client/explore", label: "Explore Resorts", icon: Building2 },
    ],
  },
  {
    label: "Bookings",
    items: [
      { href: "/dashboard/client/bookings", label: "All Bookings", icon: CalendarDays },
      { href: "/dashboard/client/reviews", label: "Reviews", icon: MessageSquare },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/client/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/client/profile", label: "Profile", icon: Settings },
      { href: "/dashboard/client/favorites", label: "Favorites", icon: Heart },
    ],
  },
];

const guestGroups: NavGroup[] = [
  {
    label: "Stay",
    items: [
      { href: "/dashboard/guest", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/guest/rooms", label: "Rooms", icon: ListChecks },
      { href: "/dashboard/guest/history", label: "Travel history", icon: CalendarDays },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/dashboard/guest/profile", label: "Profile", icon: Settings }],
  },
];

function rolePillClass(role: string): string {
  if (role === "admin")        return "bg-navy/10 text-navy ring-1 ring-navy/20";
  if (role === "resort_owner") return "bg-clOcean/10 text-clOcean ring-1 ring-clOcean/20";
  if (role === "marketing")    return "bg-violet-50 text-violet-900 ring-1 ring-violet-200/80";
  if (role === "admin_staff")  return "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80";
  if (role === "guest")        return "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80";
  return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80";
}

export default function DashboardSidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [ownerPlan, setOwnerPlan] = useState<string | null>(null);
  const [ownerSubStatus, setOwnerSubStatus] = useState<string | null>(null);
  const [verificationQueueCount, setVerificationQueueCount] = useState(0);

  const role = user?.role ?? "user";

  useEffect(() => {
    if (role !== "resort_owner") return;
    let cancelled = false;
    void getOwnerLandingPage()
      .then((lp) => {
        if (!cancelled) {
          setOwnerPlan(lp.subscription_plan ?? "standard");
          setOwnerSubStatus(lp.subscription_status ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOwnerPlan("standard");
          setOwnerSubStatus(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (role !== "admin") return;
    let cancelled = false;
    void getResortVerificationStats()
      .then((stats) => {
        if (!cancelled) setVerificationQueueCount(stats.awaiting_review);
      })
      .catch(() => {
        if (!cancelled) setVerificationQueueCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [role, pathname]);

  const guestResortLogo =
    role === "guest" && user?.home_resort?.logo_url ? laravelPublicUrl(user.home_resort.logo_url) : "";

  const isCompactSidebar = role === "admin";

  const groups = useMemo(() => {
    if (role === "admin") return adminGroups;
    if (role === "marketing") return marketingGroups;
    if (role === "admin_staff") return staffGroups;
    if (role === "guest") return clientGroups;
    if (role === "resort_owner") {
      if (isBusinessProPlan(ownerPlan, ownerSubStatus)) return resortOwnerGroups;
      return resortOwnerGroups.filter((g) => g.label !== "Revenue");
    }
    return clientGroups;
  }, [role, ownerPlan, ownerSubStatus]);

  const navIconSize = isCompactSidebar ? 14 : 15;
  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <>
      {/* Mobile overlay */}
      {open ? (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-zinc-900/35 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
        />
      ) : null}

      <aside
        className={cn(
          "dash-sidebar fixed left-0 top-0 z-50 flex h-full w-[264px] flex-col transition-transform duration-200 ease-out md:translate-x-0",
          isCompactSidebar && "dash-sidebar--compact",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* ── Logo header — dark ocean gradient ────────────────── */}
        <div className="dash-sidebar-header relative flex h-16 shrink-0 items-center justify-between overflow-hidden bg-gradient-to-br from-navy via-navy to-primaryBlue px-4 shadow-soft-sm">
          {/* Subtle diagonal sheen */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent" />

          <Link href="/dashboard" className="relative flex min-w-0 items-center gap-2.5 group" onClick={onClose}>
            {guestResortLogo ? (
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/25 bg-white/95 shadow-soft-sm">
                <Image src={guestResortLogo} alt={`${user?.home_resort?.name ?? "Resort"} logo`} fill className="object-contain p-0.5" sizes="36px" unoptimized />
              </span>
            ) : (
              <Logo size="sm" className="border-white/20 bg-white/15 shadow-soft-sm backdrop-blur-md" />
            )}
            <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
              {role === "guest" && user?.home_resort?.name ? (
                <>
                  <span className="truncate font-pop text-[15px] font-extrabold uppercase tracking-[0.06em] text-white sm:text-base">
                    {user.home_resort.name}
                  </span>
                  <BrandWordmark tone="onDark" size="2xs" className="leading-tight" />
                </>
              ) : (
                <BrandWordmark tone="onDark" size={isCompactSidebar ? "xs" : "sm"} className="leading-tight" />
              )}
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/70 backdrop-blur-md transition hover:bg-white/20 hover:text-white [touch-action:manipulation] md:hidden md:h-8 md:w-8 md:min-h-0 md:min-w-0"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── User info card ────────────────────────────────────── */}
        <div className="dash-sidebar-user-wrap border-b border-softBorder bg-gradient-to-b from-metalFace/60 to-transparent px-3 py-3">
          {user ? (
            <div className="dash-sidebar-user-card flex items-center gap-3 rounded-xl border border-softBorder bg-white px-3 py-2.5 shadow-card">
              {/* Avatar initials */}
              <div className="dash-sidebar-user-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-primaryBlue text-[13px] font-bold text-white shadow-[0_2px_6px_rgba(11,85,99,0.30)] select-none">
                {user.name
                  ?.split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() ?? "?"}
              </div>

              {/* Name + email + role */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="dash-sidebar-user-name truncate font-dash text-[13px] font-semibold text-navy leading-tight">
                    {user.name}
                  </p>
                </div>
                <p className="dash-sidebar-user-email truncate text-[11px] text-zinc-500 leading-tight mt-0.5">{user.email}</p>
                <span
                  className={`dash-sidebar-user-role mt-1.5 inline-block rounded-full px-2 py-0.5 font-dash text-[10px] font-bold uppercase tracking-wide ${rolePillClass(role)}`}
                >
                  {formatRoleLabel(role)}
                </span>
              </div>

              {/* Role icon indicator */}
              <div className="dash-sidebar-user-decor shrink-0">
                <BarChart3 size={14} className="text-slateBlue/60" aria-hidden />
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav
          className={cn(
            "dash-sidebar-nav px-3 py-4",
            isCompactSidebar
              ? "shrink-0 overflow-hidden"
              : "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          )}
          aria-label="Dashboard"
        >
          {groups.map((group) => (
            <div key={group.label} className="dash-sidebar-group mb-5">
              <p className="dash-sidebar-group-label mb-1.5 px-2 font-dash text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {group.label}
              </p>
              <ul className="dash-sidebar-group-list space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "dash-sidebar-link group flex items-center gap-3 rounded-xl px-3 py-2.5 font-dash text-dash-sm",
                          "transition-[transform,color,background-color,box-shadow] duration-150",
                          "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryBlue/50",
                          active
                            // Solid dark ocean fill — clearly selected
                              ? "bg-navy font-semibold text-white shadow-soft-sm"
                            // Hover: tinted seafoam bg + left accent bar via inset shadow
                            : "font-medium text-zinc-600 hover:bg-metalFace hover:text-navy hover:shadow-[inset_3px_0_0_theme(colors.slateBlue)]",
                        )}
                      >
                        <span
                          className={cn(
                            "dash-sidebar-link-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            "transition-[transform,color,background-color] duration-150",
                            active
                              // White-tinted icon bubble on dark bg
                              ? "bg-white/20 text-white"
                              // Hover: slightly bolder icon bg
                              : "bg-softGray text-zinc-500 group-hover:bg-navy/10 group-hover:text-navy group-hover:scale-105",
                          )}
                          aria-hidden
                        >
                          <item.icon size={navIconSize} strokeWidth={active ? 2.5 : 2} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.href === "/dashboard/admin/resort-verifications" &&
                        verificationQueueCount > 0 ? (
                          <span
                            className={cn(
                              "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                              active ? "bg-white/25 text-white" : "bg-rose-600 text-white",
                            )}
                          >
                            {verificationQueueCount > 99 ? "99+" : verificationQueueCount}
                          </span>
                        ) : null}
                        {active ? (
                          // Bright dot indicator on active dark bg
                          <span className="dash-sidebar-link-dot ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white/80 ring-4 ring-white/20" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="dash-sidebar-footer shrink-0 border-t border-softBorder bg-softGray/30 p-3">
          <button
            type="button"
            onClick={() => {
              void logout().finally(() => {
                router.replace("/");
              });
            }}
            className="dash-sidebar-logout flex w-full items-center justify-center gap-2 rounded-xl border border-softBorder bg-white py-2.5 font-dash text-dash-sm font-semibold text-zinc-600 shadow-dash-btn-sm transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-dsError/40 hover:bg-rose-50 hover:text-dsError focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/50 focus-visible:ring-offset-2"
          >
            <LogOut size={isCompactSidebar ? 14 : 15} strokeWidth={2} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
