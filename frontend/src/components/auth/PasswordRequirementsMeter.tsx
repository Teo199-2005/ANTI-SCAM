"use client";

import {
  type PasswordChecksWithMatch,
  getPasswordChecksWithMatch,
  getPasswordPolicyChecks,
  getPasswordStrengthDisplay,
} from "@/lib/passwordStrength";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

export type PasswordRequirementsMeterProps = {
  password: string;
  /** When provided, adds a “Passwords match” rule and uses a 5-segment meter. */
  confirmation?: string;
  variant?: "auth" | "dash";
  /** Tighter padding and checklist for dense auth layouts (e.g. register). */
  dense?: boolean;
  id?: string;
  className?: string;
};

export default function PasswordRequirementsMeter({
  password,
  confirmation,
  variant = "auth",
  dense = false,
  id,
  className,
}: PasswordRequirementsMeterProps) {
  const includeMatch = confirmation !== undefined;
  const policy = getPasswordPolicyChecks(password);
  const withMatch: PasswordChecksWithMatch | null = includeMatch
    ? getPasswordChecksWithMatch(password, confirmation as string)
    : null;
  const checksForMeter = withMatch ?? policy;
  const { passedCount, total, strengthLabel, strengthBarClass } = getPasswordStrengthDisplay(checksForMeter);

  const panel =
    variant === "dash"
      ? cn("rounded-xl border border-softBorder bg-softGray/40", dense ? "p-1.5" : "p-2.5")
      : cn(
          "rounded-lg border border-zinc-200/90 bg-zinc-50/90",
          dense ? "p-1.5 sm:p-2" : "p-2.5",
        );

  const items: { ok: boolean; label: string }[] = [
    { ok: policy.length, label: "At least 8 characters" },
    { ok: policy.upper, label: "Contains uppercase letter" },
    { ok: policy.lower, label: "Contains lowercase letter" },
    { ok: policy.number, label: "Contains a number" },
  ];
  if (withMatch) {
    items.push({ ok: withMatch.match, label: "Passwords match" });
  }

  return (
    <div id={id} className={cn(panel, className)}>
      <div className={cn("flex items-center justify-between gap-2", dense ? "mb-1" : "mb-1.5")}>
        <p className={cn("font-semibold text-zinc-700", dense ? "text-[11px]" : "text-xs")}>
          Strength: {strengthLabel}
        </p>
        <span className={cn("shrink-0 text-zinc-500", dense ? "text-[10px]" : "text-[11px]")}>
          {passedCount}/{total}
        </span>
      </div>
      <div className={cn("w-full overflow-hidden rounded-full bg-zinc-200", dense ? "h-0.5" : "h-1")}>
        <div className={`h-full transition-[width] duration-200 ${strengthBarClass}`} style={{ width: `${(passedCount / total) * 100}%` }} />
      </div>
      <ul
        className={cn(
          "grid text-zinc-600 sm:grid-cols-2",
          dense ? "mt-1 gap-0 text-[10px] leading-tight" : "mt-2 gap-0.5 text-[11px]",
        )}
      >
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {item.ok ? (
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <XCircle size={14} className="shrink-0 text-zinc-400" aria-hidden />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
