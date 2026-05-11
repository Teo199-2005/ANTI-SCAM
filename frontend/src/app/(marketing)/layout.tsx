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
  /** Premium home ships its own header; skip duplicate `Navbar` and use a tighter main shell. */
  const marketingHomeFullBleed = pathname === "/";

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

  if (marketingHomeFullBleed) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-white">
        {/* No flex-1 — avoid a tall empty band above <Footer /> when page content is shorter than the viewport */}
        <main className="relative z-0 min-w-0 shrink-0 grow-0">{children}</main>
        <Footer />
      </div>
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
