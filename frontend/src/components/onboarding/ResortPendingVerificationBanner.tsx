"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Shield } from "lucide-react";

const CHECKLIST = [
  { key: "owner", label: "Owner account" },
  { key: "business", label: "Business profile" },
  { key: "property", label: "Property details" },
  { key: "rooms", label: "Rooms & photos" },
  { key: "pricing", label: "Pricing" },
  { key: "verification", label: "Verification review" },
] as const;

export function ResortPendingVerificationBanner() {
  const { user } = useAuth();
  if (!user || user.role !== "resort_owner") return null;
  if (user.registration_status !== "complete") return null;
  if (user.verification_status === "verified") return null;

  const submitted = Boolean(user.verification_submitted_at);
  const rejected = user.verification_status === "rejected";
  const needsDocuments = user.verification_status === "needs_documents";
  const submissionCount = user.verification_submission_count ?? 0;
  const rejectionReason = user.verification_rejection_reason?.trim();

  return (
    <div
      className={cn(
        "mb-6 overflow-hidden rounded-2xl border p-5 shadow-sm",
        rejected || needsDocuments
          ? "border-rose-200 bg-gradient-to-r from-rose-50 to-white"
          : "border-amber-200 bg-gradient-to-r from-amber-50 to-white",
      )}
    >
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            rejected || needsDocuments ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800",
          )}
        >
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-dash text-lg text-[#0d1f3c]">
            {needsDocuments
              ? "More documents needed"
              : rejected
                ? "Verification not approved"
                : submitted
                  ? "Verification in progress"
                  : "Complete verification to go live"}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {needsDocuments
              ? "Our team needs additional documents or corrections before we can verify your resort. Open registration step 6 to resubmit."
              : rejected
                ? "Your submission was not approved. Update your documents and resubmit verification (registration step 6)."
                : submitted
                  ? "Our Anti-Scam PH team is reviewing your documents (typically 24–72 hours). Your property stays hidden from public search and bookings until approved."
                  : "Finish step 6 in registration to submit your government ID, property tour, and ownership proof."}
          </p>
          {submissionCount > 0 ? (
            <p className="mt-2 text-xs font-medium text-zinc-600">
              Submission #{submissionCount}
              {submissionCount > 1 ? " (resubmission)" : ""}
            </p>
          ) : null}
          {(rejected || needsDocuments) && rejectionReason ? (
            <div className="mt-3 rounded-xl border border-rose-200/80 bg-white/80 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-800">Team note</p>
              <p className="mt-1 text-sm text-zinc-800">{rejectionReason}</p>
            </div>
          ) : null}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {CHECKLIST.map((item, index) => {
              const done = index < 5 || submitted;
              const pending = item.key === "verification" && !submitted;
              return (
                <li key={item.key} className="flex items-center gap-2 text-sm text-zinc-700">
                  {done && !pending ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : pending ? (
                    <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  )}
                  {item.label}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">
            Public listing and new guest bookings remain disabled until verification is approved.
          </p>
        </div>
      </div>
    </div>
  );
}
