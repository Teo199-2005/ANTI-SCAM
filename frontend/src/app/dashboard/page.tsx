"use client";

import AppLoadingScreen from "@/components/layout/AppLoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    if (user.role === "resort_owner") {
      router.replace("/dashboard/resort");
      return;
    }

    if (user.role === "admin") {
      router.replace("/dashboard/admin");
      return;
    }

    if (user.role === "client" || user.role === "user") {
      router.replace("/dashboard/client");
      return;
    }

    if (user.role === "guest") {
      router.replace("/dashboard/guest");
      return;
    }

    if (user.role === "marketing") {
      router.replace("/dashboard/marketing");
      return;
    }

    if (user.role === "admin_staff") {
      router.replace("/dashboard/staff");
      return;
    }

    router.replace("/");
  }, [user, loading, router]);

  return (
    <AppLoadingScreen message="Redirecting…" submessage="Taking you to your role dashboard." />
  );
}
