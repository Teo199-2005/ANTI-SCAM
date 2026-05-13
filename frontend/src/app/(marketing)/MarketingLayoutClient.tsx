"use client";

import { ResortGuestPublicFooter } from "@/components/auth/ResortGuestPublicFooter";
import AppLoadingScreen from "@/components/layout/AppLoadingScreen";
import Footer from "@/components/layout/Footer";
import { MarketingPremiumNavbar } from "@/components/layout/MarketingPremiumNavbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  isAuthMarketingNavOverlayPath,
  isAuthSplitShellPath,
  MARKETING_OVERLAY_MAIN_TOP_PAD_CLASS,
} from "@/lib/authMarketingNavOverlay";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

/**
 * Guest signup / login from a public resort page uses `?resort=subdomain`.
 * Logged-in resort owners must still reach those routes to create a separate guest account,
 * so we do not auto-redirect them to the owner dashboard when this param is present.
 */
function guestResortAuthFromSearch(pathname: string, resortParam: string | null): boolean {
  const slug = resortParam?.trim() ?? "";
  if (!slug) return false;
  return pathname === "/login" || pathname === "/register" || pathname.startsWith("/login/") || pathname.startsWith("/register/");
}

export default function MarketingLayoutClient({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const allowAuthWhileSignedIn = useMemo(
    () => guestResortAuthFromSearch(pathname, searchParams.get("resort")),
    [pathname, searchParams],
  );

  const fixedOverlayNav = isAuthMarketingNavOverlayPath(pathname);
  const mainTopPadForFixedNav = fixedOverlayNav && !isAuthSplitShellPath(pathname);
  const marketingHomeFullBleed = pathname === "/";

  useEffect(() => {
    if (!loading && user && !allowAuthWhileSignedIn) {
      router.replace("/dashboard");
    }
  }, [allowAuthWhileSignedIn, loading, router, user]);

  if (loading) {
    return (
      <AppLoadingScreen variant="marketing" message="Loading…" submessage="Checking your session." />
    );
  }

  if (user && !allowAuthWhileSignedIn) {
    return (
      <AppLoadingScreen
        variant="marketing"
        message="Redirecting…"
        submessage="You’re already signed in. Sending you to your dashboard."
      />
    );
  }

  if (marketingHomeFullBleed) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-white">
        <main className="relative z-0 min-w-0 shrink-0 grow-0">{children}</main>
        <Footer />
      </div>
    );
  }

  const resortSlugForGuestAuth = searchParams.get("resort")?.trim() ?? "";

  if (allowAuthWhileSignedIn && resortSlugForGuestAuth) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-[#f4f7fb]">
        <main className="relative z-0 min-w-0 flex-1">{children}</main>
        <ResortGuestPublicFooter resortSlug={resortSlugForGuestAuth} />
      </div>
    );
  }

  const marketingNavMode = isAuthSplitShellPath(pathname) ? "auth-overlay" : "marketing-solid";

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <MarketingPremiumNavbar mode={marketingNavMode} />
      <main
        className={cn(
          "relative z-0 flex-1 min-w-0",
          mainTopPadForFixedNav && MARKETING_OVERLAY_MAIN_TOP_PAD_CLASS,
        )}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
