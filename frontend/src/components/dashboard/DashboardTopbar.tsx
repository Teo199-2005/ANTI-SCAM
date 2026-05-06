"use client";

import { useAuth } from "@/contexts/AuthContext";
import { formatRoleLabel } from "@/lib/utils";
import { ChevronRight, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function segmentLabel(segment: string): string {
  return segment.replaceAll("-", " ").replaceAll("_", " ");
}

function roleBadgeClass(role: string): string {
  if (role === "admin") return "bg-navy/10 text-navy ring-1 ring-navy/20";
  if (role === "resort_owner") return "bg-clOcean/10 text-clOcean ring-1 ring-clOcean/20";
  return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80";
}

type DashboardTopbarProps = { onOpenMenu: () => void };

export default function DashboardTopbar({ onOpenMenu }: DashboardTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const crumbs = pathname.split("/").filter(Boolean).slice(1);
  const initials =
    user?.name
      ?.split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  const leaf = crumbs.length ? segmentLabel(crumbs[crumbs.length - 1]!) : "Dashboard";
  const roleLabel = formatRoleLabel(user?.role);

  return (
    <header className="dash-topbar sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-softBorder bg-white/90 text-zinc-500 shadow-soft-sm transition-[transform,color,background-color,border-color,box-shadow] duration-150 hover:border-navy/20 hover:bg-navy/5 hover:text-navy active:scale-[0.96] md:hidden"
          onClick={onOpenMenu}
          aria-label="Open navigation"
        >
          <Menu size={16} />
        </button>

        <div className="min-w-0">
          <p className="truncate font-dash text-dash-sm font-semibold capitalize text-navy md:hidden">{leaf}</p>
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1 font-dash text-dash-xs text-zinc-500 md:flex">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-lg border border-transparent px-2 py-1 transition-colors hover:border-navy/15 hover:bg-navy/5 hover:text-navy"
            >
              Dashboard
            </Link>
            {crumbs.map((crumb, idx) => {
              const href = `/${["dashboard", ...crumbs.slice(0, idx + 1)].join("/")}`;
              const isLast = idx === crumbs.length - 1;
              return (
                <span key={`${crumb}-${href}`} className="inline-flex items-center gap-1">
                  <ChevronRight size={11} className="shrink-0 text-zinc-300" aria-hidden />
                  {isLast ? (
                    <span className="truncate rounded-lg bg-navy/10 px-2 py-1 font-semibold capitalize text-navy ring-1 ring-navy/10">
                      {segmentLabel(crumb)}
                    </span>
                  ) : (
                    <Link
                      href={href}
                      className="inline-flex items-center rounded-lg border border-transparent px-2 py-1 capitalize transition-colors hover:border-navy/15 hover:bg-navy/5 hover:text-navy"
                    >
                      {segmentLabel(crumb)}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {user ? (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-gradient-to-b from-white to-softCard/90 py-1 pl-1 pr-2 shadow-card">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-primaryBlue text-dash-xs font-bold text-white shadow-soft-sm">
                {initials}
              </span>
              <div className="hidden min-w-0 max-w-[140px] sm:block">
                <p className="truncate font-dash text-dash-xs font-semibold text-navy">{user.name}</p>
                <p className="truncate font-dash text-[10px] text-zinc-500">{user.email}</p>
                <span
                  className={`inline-flex rounded-full px-1.5 py-0.5 font-dash text-[10px] font-bold uppercase tracking-wide ${roleBadgeClass(user.role)}`}
                >
                  {roleLabel}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void logout().finally(() => {
                  router.replace("/");
                });
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-softBorder bg-white/95 px-3 py-2 font-dash text-dash-xs font-semibold text-navy shadow-soft-sm transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-navy/30 hover:bg-navy/5 hover:text-navy hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 focus-visible:ring-offset-2"
              aria-label="Log out"
            >
              <LogOut size={14} strokeWidth={2} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
