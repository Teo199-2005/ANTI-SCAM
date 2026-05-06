"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cn, formatRoleLabel } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  Bell,
  Heart,
  Percent,
  Plus,
  Settings,
  TrendingUp,
  Users,
  Webhook,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/layout/Logo";

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
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/dashboard/admin/resorts",       label: "Resorts",       icon: Building2 },
      { href: "/dashboard/admin/users",          label: "Users",         icon: Users },
      { href: "/dashboard/admin/reservations",   label: "Reservations",  icon: CalendarDays },
      { href: "/dashboard/admin/subscriptions",  label: "Subscriptions", icon: CreditCard },
      { href: "/dashboard/admin/suspensions",    label: "Suspensions",   icon: AlertTriangle },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/admin/onboard",     label: "Onboard Resort",   icon: Plus },
      { href: "/dashboard/admin/xendit-logs", label: "Payment Logs",     icon: Webhook },
      { href: "/dashboard/admin/audit-logs",  label: "Audit Logs",       icon: FileText },
      { href: "/dashboard/admin/settings",    label: "System Settings",  icon: Settings },
    ],
  },
];

const marketingGroups: NavGroup[] = [
  {
    label: "Marketing",
    items: [
      { href: "/dashboard/marketing", label: "Overview", icon: TrendingUp, exact: true },
    ],
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
      { href: "/dashboard/resort/subscription", label: "Subscription", icon: CreditCard },
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

function rolePillClass(role: string): string {
  if (role === "admin")        return "bg-navy/10 text-navy ring-1 ring-navy/20";
  if (role === "resort_owner") return "bg-clOcean/10 text-clOcean ring-1 ring-clOcean/20";
  if (role === "marketing")    return "bg-violet-50 text-violet-900 ring-1 ring-violet-200/80";
  if (role === "admin_staff")  return "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80";
  return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80";
}

export default function DashboardSidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const role = user?.role ?? "user";
  const groups =
    role === "admin"        ? adminGroups :
    role === "resort_owner" ? resortOwnerGroups :
    role === "marketing"    ? marketingGroups :
    role === "admin_staff"  ? staffGroups :
    clientGroups;
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
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* ── Logo header — dark ocean gradient ────────────────── */}
        <div className="relative flex h-16 shrink-0 items-center justify-between overflow-hidden bg-gradient-to-br from-navy via-navy to-primaryBlue px-4 shadow-soft-sm">
          {/* Subtle diagonal sheen */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent" />

          <Link href="/dashboard" className="relative flex items-center gap-2.5 group" onClick={onClose}>
            <Logo
              size="sm"
              className="border-white/20 bg-white/15 shadow-soft-sm backdrop-blur-md"
            />
            <div className="leading-tight">
              <span className="block font-dash text-sm font-bold tracking-tight text-white transition-colors group-hover:text-white/85">
                Anti-Scam PH
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                Console
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/70 backdrop-blur-md transition hover:bg-white/20 hover:text-white md:hidden"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── User info card ────────────────────────────────────── */}
        <div className="border-b border-softBorder bg-gradient-to-b from-metalFace/60 to-transparent px-3 py-3">
          {user ? (
            <div className="flex items-center gap-3 rounded-xl border border-softBorder bg-white px-3 py-2.5 shadow-card">
              {/* Avatar initials */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-primaryBlue text-[13px] font-bold text-white shadow-[0_2px_6px_rgba(11,85,99,0.30)] select-none">
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
                  <p className="truncate font-dash text-[13px] font-semibold text-navy leading-tight">
                    {user.name}
                  </p>
                </div>
                <p className="truncate text-[11px] text-zinc-500 leading-tight mt-0.5">{user.email}</p>
                <span
                  className={`mt-1.5 inline-block rounded-full px-2 py-0.5 font-dash text-[10px] font-bold uppercase tracking-wide ${rolePillClass(role)}`}
                >
                  {formatRoleLabel(role)}
                </span>
              </div>

              {/* Role icon indicator */}
              <div className="shrink-0">
                <BarChart3 size={14} className="text-slateBlue/60" aria-hidden />
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-2 font-dash text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 font-dash text-dash-sm",
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
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            "transition-[transform,color,background-color] duration-150",
                            active
                              // White-tinted icon bubble on dark bg
                              ? "bg-white/20 text-white"
                              // Hover: slightly bolder icon bg
                              : "bg-softGray text-zinc-500 group-hover:bg-navy/10 group-hover:text-navy group-hover:scale-105",
                          )}
                          aria-hidden
                        >
                          <item.icon size={15} strokeWidth={active ? 2.5 : 2} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {active ? (
                          // Bright dot indicator on active dark bg
                          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white/80 ring-4 ring-white/20" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-softBorder bg-softGray/30 p-3">
          <button
            type="button"
            onClick={() => {
              void logout().finally(() => {
                router.replace("/");
              });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-softBorder bg-white py-2.5 font-dash text-dash-sm font-semibold text-zinc-600 shadow-dash-btn-sm transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-dsError/40 hover:bg-rose-50 hover:text-dsError focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/50 focus-visible:ring-offset-2"
          >
            <LogOut size={15} strokeWidth={2} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
