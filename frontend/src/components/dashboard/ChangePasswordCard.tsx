"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import PasswordRequirementsMeter from "@/components/auth/PasswordRequirementsMeter";
import { getPasswordPolicyChecks, passwordPolicyMet } from "@/lib/passwordStrength";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { type ReactNode, useState } from "react";

export type ChangePasswordCardProps = {
  /** Prefix for input ids so multiple instances on one route stay unique */
  idPrefix?: string;
  title?: string;
  description?: ReactNode;
  /** Second line of toast on success */
  successHint?: string;
  className?: string;
};

const defaultDescription: ReactNode = (
  <>
    Use at least 8 characters with uppercase, lowercase, and a number. Other signed-in sessions will be signed out after you
    change your password.
  </>
);

export default function ChangePasswordCard({
  idPrefix = "change-password",
  title = "Change password",
  description = defaultDescription,
  successHint = "You can use your new password next time you sign in. Other sessions were signed out.",
  className,
}: ChangePasswordCardProps) {
  const { pushToast } = useToast();
  const { refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      pushToast({
        title: "Passwords don’t match",
        description: "New password and confirmation must be identical.",
        tone: "warning",
      });
      return;
    }
    if (!passwordPolicyMet(getPasswordPolicyChecks(newPassword))) {
      pushToast({
        title: "Password requirements not met",
        description: "Use at least 8 characters with uppercase, lowercase, and a number.",
        tone: "warning",
      });
      return;
    }
    setSavingPw(true);
    try {
      await apiClient.post("/auth/password", {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshUser();
      pushToast({ title: "Password updated", description: successHint, tone: "success" });
    } catch (error: unknown) {
      pushToast({
        title: "Couldn’t change password",
        description: parseApiErrorMessage(error, "Check your current password and try again."),
        tone: "error",
      });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className={cn("dash-card p-6", className)}>
      <h2 className="mb-2 inline-flex items-center gap-2 font-dash text-lg font-semibold text-navy">
        <Lock size={18} className="text-skyBlue" />
        {title}
      </h2>
      {description ? <p className="mb-4 text-sm text-zinc-600">{description}</p> : null}
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${idPrefix}-current`} className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Current password
            </label>
            <div className="relative">
              <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id={`${idPrefix}-current`}
                className="dash-input pl-9 pr-10"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor={`${idPrefix}-new`} className="mb-1.5 block text-xs font-semibold text-zinc-600">
              New password
            </label>
            <div className="relative">
              <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id={`${idPrefix}-new`}
                className="dash-input pl-9 pr-10"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                aria-describedby={`${idPrefix}-new-meter`}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <PasswordRequirementsMeter
              variant="dash"
              password={newPassword}
              confirmation={confirmPassword}
              id={`${idPrefix}-new-meter`}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor={`${idPrefix}-confirm`} className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Confirm new password
            </label>
            <div className="relative max-w-full md:max-w-md">
              <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id={`${idPrefix}-confirm`}
                className="dash-input pl-9 pr-10"
                type={showNew ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                aria-label={showNew ? "Hide confirmation" : "Show confirmation"}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <button type="submit" disabled={savingPw} className="dash-btn-primary px-6 py-2.5 disabled:opacity-60">
              {savingPw ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Updating password…
                </span>
              ) : (
                "Update password"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
