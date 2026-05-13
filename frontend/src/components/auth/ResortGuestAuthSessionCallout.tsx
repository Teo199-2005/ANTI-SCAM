"use client";

import { useAuth } from "@/contexts/AuthContext";
import { formatRoleLabel } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

type Props = {
  resortSlug: string;
  resortName: string | null;
  /** Where to return after sign-out so the user can continue the intended flow. */
  afterSignOut: "login" | "register";
};

/**
 * When someone is already signed in (e.g. resort owner) but opened guest Register/Login from a public resort page.
 */
export function ResortGuestAuthSessionCallout({ resortSlug, resortName, afterSignOut }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const displayResort = resortName?.trim() || resortSlug;

  const signOutHere = async () => {
    await logout();
    const path = afterSignOut === "login" ? "login" : "register";
    router.replace(`/${path}?resort=${encodeURIComponent(resortSlug)}`);
    router.refresh();
  };

  if (user.role === "guest") {
    return (
      <div className="mb-4 rounded-xl border border-sky-200/90 bg-sky-50/95 px-3 py-2.5 text-sm text-navy">
        <p className="leading-snug">
          You are already signed in as a guest.{" "}
          <Link href="/dashboard/guest" className="font-semibold text-clOcean underline underline-offset-2">
            Open your stay dashboard
          </Link>
          , or sign out to use another account for <span className="font-semibold">{displayResort}</span>.
        </p>
        <button
          type="button"
          onClick={() => void signOutHere()}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-navy/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy shadow-sm transition hover:bg-zinc-50"
        >
          <LogOut size={14} aria-hidden />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/95 px-3 py-2.5 text-sm text-amber-950">
      <p className="leading-snug">
        You are signed in as <span className="font-semibold">{user.name}</span> ({formatRoleLabel(user.role)}). To
        register or sign in as a <span className="font-semibold">guest</span> for{" "}
        <span className="font-semibold">{displayResort}</span>, sign out first.
      </p>
      <button
        type="button"
        onClick={() => void signOutHere()}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-300/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50"
      >
        <LogOut size={14} aria-hidden />
        Sign out
      </button>
    </div>
  );
}
