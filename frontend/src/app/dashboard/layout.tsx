"use client";

import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import AppLoadingScreen from "@/components/layout/AppLoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    const defaultByRole: Record<string, string> = {
      admin: "/dashboard/admin",
      resort_owner: "/dashboard/resort",
      marketing: "/dashboard/marketing",
      admin_staff: "/dashboard/staff",
      client: "/dashboard/client",
      user: "/dashboard/client",
    };

    const allowedPrefixByRole: Record<string, string> = {
      admin: "/dashboard/admin",
      resort_owner: "/dashboard/resort",
      marketing: "/dashboard/marketing",
      admin_staff: "/dashboard/staff",
      client: "/dashboard/client",
      user: "/dashboard/client",
    };

    const allowedPrefix = allowedPrefixByRole[user.role];
    if (!allowedPrefix || pathname === "/dashboard") return;
    if (!pathname.startsWith(allowedPrefix)) {
      router.replace(defaultByRole[user.role] ?? "/dashboard");
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return <AppLoadingScreen variant="dashboard" message="Signing you in…" />;
  }

  if (!user) {
    return (
      <AppLoadingScreen
        message="Redirecting…"
        submessage="Checking access and routing your session."
      />
    );
  }

  return (
    <div className="dash-shell flex min-h-screen">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col md:pl-[264px]">
        <DashboardTopbar onOpenMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <div className="dash-shell-main">{children}</div>
        </main>
      </div>
    </div>
  );
}
