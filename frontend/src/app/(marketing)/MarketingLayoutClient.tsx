"use client";

import AppLoadingScreen from "@/components/layout/AppLoadingScreen";
import Footer from "@/components/layout/Footer";
import { MarketingPremiumNavbar } from "@/components/layout/MarketingPremiumNavbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  isAuthMarketingNavOverlayPath,
  isAuthSplitShellPath,
  isResortGuestBookingFlowPath,
  isSignedInAllowedMarketingPath,
  MARKETING_OVERLAY_MAIN_TOP_PAD_CLASS,
} from "@/lib/authMarketingNavOverlay";
import { ResortGuestBookingFlowLayout } from "@/components/layout/ResortGuestBookingFlowLayout";
import { ResortGuestSlugChromeLayout } from "@/components/layout/ResortGuestSlugChromeLayout";
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

  const isGuestResortAuthPath = useMemo(
    () => guestResortAuthFromSearch(pathname, searchParams.get("resort")),
    [pathname, searchParams],
  );

  /** Resort ?resort= login/register OR checkout / payment return — do not bounce signed-in users to /dashboard. */
  const allowMarketingWhileSignedIn = useMemo(
    () => isGuestResortAuthPath || isSignedInAllowedMarketingPath(pathname),
    [isGuestResortAuthPath, pathname],
  );

  const fixedOverlayNav = isAuthMarketingNavOverlayPath(pathname);
  const mainTopPadForFixedNav = fixedOverlayNav && !isAuthSplitShellPath(pathname);
  const marketingHomeFullBleed = pathname === "/";

  useEffect(() => {
    if (!loading && user && !allowMarketingWhileSignedIn) {
      router.replace("/dashboard");
    }
  }, [allowMarketingWhileSignedIn, loading, router, user]);

  if (loading) {
    return (
      <AppLoadingScreen variant="marketing" message="Loading…" submessage="Checking your session." />
    );
  }

  if (user && !allowMarketingWhileSignedIn) {
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

  if (isGuestResortAuthPath && resortSlugForGuestAuth) {
    return (
      <ResortGuestSlugChromeLayout resortSlug={resortSlugForGuestAuth}>{children}</ResortGuestSlugChromeLayout>
    );
  }

  if (isResortGuestBookingFlowPath(pathname)) {
    return <ResortGuestBookingFlowLayout>{children}</ResortGuestBookingFlowLayout>;
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
