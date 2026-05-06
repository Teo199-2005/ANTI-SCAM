"use client";

import AppLoadingScreen from "@/components/layout/AppLoadingScreen";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  if (!loading && user) {
    return (
      <AppLoadingScreen
        message="Redirecting…"
        submessage="You’re already signed in. Sending you to your dashboard."
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
