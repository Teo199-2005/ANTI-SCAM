"use client";
 
import { ResortPlanBadge } from "@/components/badges/ResortPlanBadge";
import { cn } from "@/lib/utils";
import { BedDouble, Crown, Sparkles, ShieldAlert } from "lucide-react";
 
type Props = {
  badgeLabel?: string | null;
  isPremiumVerified?: boolean;
  isVip?: boolean;
  activeRoomsCount?: number;
  className?: string;
  verificationStatus?: string;
};
 
/** Trust + plan tags for public resort catalog cards. */
export function ResortCatalogBadges({
  badgeLabel,
  isPremiumVerified,
  isVip,
  activeRoomsCount,
  className,
  verificationStatus,
}: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {isVip ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-gradient-to-r from-amber-100 to-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
          <Crown className="h-3 w-3 text-amber-700" aria-hidden />
          VIP
        </span>
      ) : null}
      {verificationStatus && verificationStatus !== "verified" ? (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm",
            verificationStatus === "not_verified"
              ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200/90"
              : verificationStatus === "pending" || verificationStatus === "needs_documents"
                ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200/90"
                : "bg-rose-50 text-rose-900 ring-1 ring-rose-200/90"
          )}
        >
          <ShieldAlert
            className={cn(
              "h-2.5 w-2.5 shrink-0",
              verificationStatus === "not_verified"
                ? "text-amber-700"
                : verificationStatus === "pending" || verificationStatus === "needs_documents"
                  ? "text-sky-700"
                  : "text-rose-700"
            )}
            aria-hidden
          />
          {verificationStatus === "not_verified" && "Unverified"}
          {(verificationStatus === "pending" || verificationStatus === "needs_documents") && "Verification Pending"}
          {verificationStatus === "rejected" && "Rejected"}
        </span>
      ) : (
        badgeLabel ? (
          <ResortPlanBadge badgeLabel={badgeLabel} isPremiumVerified={isPremiumVerified} />
        ) : null
      )}
      {isPremiumVerified ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200/90">
          <Sparkles className="h-2.5 w-2.5" aria-hidden />
          Priority
        </span>
      ) : null}
      {typeof activeRoomsCount === "number" ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-semibold text-zinc-700 ring-1 ring-zinc-200/90">
          <BedDouble className="h-2.5 w-2.5" aria-hidden />
          {activeRoomsCount} {activeRoomsCount === 1 ? "room" : "rooms"}
        </span>
      ) : null}
    </div>
  );
}
