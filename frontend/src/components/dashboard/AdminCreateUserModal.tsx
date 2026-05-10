"use client";

import DashModal from "@/components/dash/DashModal";
import PasswordRequirementsMeter from "@/components/auth/PasswordRequirementsMeter";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { sanitizeEmailTyping, sanitizePersonName } from "@/lib/inputRestrictions";
import { getPasswordPolicyChecks, passwordPolicyMet } from "@/lib/passwordStrength";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "marketing", label: "Marketing partner" },
  { value: "resort_owner", label: "Resort owner" },
  { value: "client", label: "Client (guest)" },
  { value: "user", label: "User" },
  { value: "admin_staff", label: "Admin staff" },
  { value: "admin", label: "Admin" },
];

export type AdminCreateUserModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful create (e.g. refresh list) */
  onCreated?: () => void;
};

export default function AdminCreateUserModal({ open, onClose, onCreated }: AdminCreateUserModalProps) {
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("marketing");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setRole("marketing");
    setPassword("");
    setPasswordConfirmation("");
    setShowPw(false);
    setShowPw2(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPolicyMet(getPasswordPolicyChecks(password))) {
      pushToast({
        title: "Password requirements not met",
        description: "Use at least 8 characters with uppercase, lowercase, and a number.",
        tone: "warning",
      });
      return;
    }
    if (password !== passwordConfirmation) {
      pushToast({
        title: "Passwords don’t match",
        description: "Password and confirmation must be identical.",
        tone: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post("/users", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      pushToast({ title: "User created", description: `${name.trim()} can sign in with this email.`, tone: "success" });
      reset();
      onClose();
      onCreated?.();
    } catch (err) {
      pushToast({
        title: "Could not create user",
        description: parseApiErrorMessage(err, "Check the form and try again."),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashModal
      open={open}
      onClose={handleClose}
      title={
        <span className="inline-flex items-center gap-2">
          <UserPlus size={18} className="text-skyBlue" />
          Add user
        </span>
      }
      description="Create a platform account (e.g. marketing partner). They sign in with the email and password you set."
      initialFocusSelector="#admin-create-user-name"
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="admin-create-user-name" className="mb-1.5 block text-xs font-semibold text-zinc-600">
            Full name
          </label>
          <input
            id="admin-create-user-name"
            className="dash-input"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(sanitizePersonName(e.target.value))}
            placeholder="Legal name"
          />
        </div>
        <div>
          <label htmlFor="admin-create-user-email" className="mb-1.5 block text-xs font-semibold text-zinc-600">
            Email
          </label>
          <input
            id="admin-create-user-email"
            className="dash-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(sanitizeEmailTyping(e.target.value).toLowerCase())}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="admin-create-user-role" className="mb-1.5 block text-xs font-semibold text-zinc-600">
            Role
          </label>
          <select
            id="admin-create-user-role"
            className="dash-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-create-user-password" className="mb-1.5 block text-xs font-semibold text-zinc-600">
            Password
          </label>
          <div className="relative">
            <input
              id="admin-create-user-password"
              className="dash-input pr-10"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="admin-create-user-pw-meter"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">At least 8 characters with uppercase, lowercase, and a number.</p>
          <PasswordRequirementsMeter
            className="mt-2"
            variant="dash"
            password={password}
            confirmation={passwordConfirmation}
            id="admin-create-user-pw-meter"
          />
        </div>
        <div>
          <label htmlFor="admin-create-user-password-2" className="mb-1.5 block text-xs font-semibold text-zinc-600">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="admin-create-user-password-2"
              className="dash-input pr-10"
              type={showPw2 ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              onClick={() => setShowPw2((v) => !v)}
              aria-label={showPw2 ? "Hide confirmation" : "Show confirmation"}
            >
              {showPw2 ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-softBorder pt-4 sm:flex-row sm:justify-end">
          <button type="button" className="dash-btn-sm justify-center px-4 py-2.5 sm:min-w-[100px]" disabled={saving} onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="dash-btn-primary justify-center px-6 py-2.5 disabled:opacity-60" disabled={saving}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Creating…
              </span>
            ) : (
              "Create user"
            )}
          </button>
        </div>
      </form>
    </DashModal>
  );
}
