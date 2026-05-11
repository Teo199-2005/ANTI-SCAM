"use client";

import AppLoadingScreen from "@/components/layout/AppLoadingScreen";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  isAuthMarketingNavOverlayPath,
  isAuthSplitShellPath,
  MARKETING_OVERLAY_MAIN_TOP_PAD_CLASS,
} from "@/lib/authMarketingNavOverlay";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const fixedOverlayNav = isAuthMarketingNavOverlayPath(pathname);
  /** Home (`/`) only — auth pages use `AuthSplitShell` for their own top offset. */
  const mainTopPadForFixedNav = fixedOverlayNav && !isAuthSplitShellPath(pathname);

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
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Navbar />
      <main
        className={cn(
          "relative z-0 flex-1 min-w-0",
          mainTopPadForFixedNav && MARKETING_OVERLAY_MAIN_TOP_PAD_CLASS
        )}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
