"use client";

import DashModal from "@/components/dash/DashModal";
import { PhilippineLocationPicker, type PhilippineLocationValue } from "@/components/locations/PhilippineLocationPicker";
import { useToast } from "@/components/shared/ToastProvider";
import {
  getAdminUserSubscription,
  updateAdminUserSubscription,
  type AdminUserSubscriptionInfo,
} from "@/lib/api/admin";
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { sanitizeEmailTyping, sanitizePersonName } from "@/lib/inputRestrictions";
import { normalizeProvinceCodeForDisplay } from "@/lib/locations/phLocationApiCache";
import { Eye, EyeOff, Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "marketing", label: "Marketing partner" },
  { value: "resort_owner", label: "Resort owner" },
  { value: "client", label: "Client (guest)" },
  { value: "user", label: "User" },
  { value: "admin_staff", label: "Admin staff" },
  { value: "admin", label: "Admin" },
];

export type AdminEditableUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  mailing_province_psgc?: string | null;
  mailing_city_municipality_psgc?: string | null;
  mailing_barangay_name?: string | null;
  mailing_location_label?: string | null;
};

type Props = {
  open: boolean;
  user: AdminEditableUser | null;
  onClose: () => void;
  onSaved?: () => void;
};

export default function AdminEditUserModal({ open, user, onClose, onSaved }: Props) {
  const { pushToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<PhilippineLocationValue>({
    provinceCode: null,
    cityCode: null,
    barangayName: null,
  });
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resortName, setResortName] = useState<string | null>(null);
  const [subPlan, setSubPlan] = useState("standard");
  const [subStatus, setSubStatus] = useState("active");
  const [subNextDue, setSubNextDue] = useState("");
  const [subCycleEnd, setSubCycleEnd] = useState("");
  const [subLoading, setSubLoading] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [useCustomBookingRate, setUseCustomBookingRate] = useState(false);
  const [customBookingRate, setCustomBookingRate] = useState("");

  // Populate form when the user prop changes.
  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setRole(user.role ?? "user");
    setPhone(user.phone ?? "");
    setLocation({
      provinceCode: normalizeProvinceCodeForDisplay(user.mailing_province_psgc ?? null),
      cityCode: user.mailing_city_municipality_psgc ?? null,
      barangayName: user.mailing_barangay_name ?? null,
    });
    setNewPassword("");
    setShowPw(false);
    setResortName(null);
    setHasSubscription(false);
    setUseCustomBookingRate(false);
    setCustomBookingRate("");
    if (user.role === "marketing") {
      void apiClient
        .get<{ data: { booking_commission_php?: number | null } }>(`/users/${user.id}`)
        .then(({ data }) => {
          const custom = data.data?.booking_commission_php != null;
          setUseCustomBookingRate(custom);
          setCustomBookingRate(custom ? String(data.data.booking_commission_php) : "");
        })
        .catch(() => {});
    }
    if (user.role === "resort_owner") {
      setSubLoading(true);
      void getAdminUserSubscription(user.id)
        .then((res) => {
          if (!res?.subscription) return;
          const s: AdminUserSubscriptionInfo = res.subscription;
          setResortName(res.resort_name);
          setHasSubscription(true);
          setSubPlan(s.plan);
          setSubStatus(s.status);
          setSubNextDue(s.next_due_date ?? "");
          setSubCycleEnd(s.billing_cycle_end ?? "");
        })
        .catch(() => {
          setHasSubscription(false);
        })
        .finally(() => setSubLoading(false));
    }
  }, [user]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload: Record<string, string | number | null | undefined> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        phone: phone.trim() || null,
        mailing_province_psgc: location.provinceCode || null,
        mailing_city_municipality_psgc: location.cityCode || null,
        mailing_barangay_name: location.barangayName?.trim() || null,
      };
      if (newPassword) {
        payload.password = newPassword;
        payload.password_confirmation = newPassword;
      }
      if (role === "marketing") {
        if (useCustomBookingRate) {
          const parsed = Number(String(customBookingRate).replace(/,/g, "").trim());
          if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5000) {
            pushToast({
              title: "Invalid booking commission",
              description: "Enter ₱1–₱5,000 or uncheck custom rate to use the platform default.",
              tone: "error",
            });
            setSaving(false);
            return;
          }
          payload.booking_commission_php = Math.round(parsed * 100) / 100;
        } else {
          payload.booking_commission_php = null;
        }
      }
      await apiClient.put(`/users/${user.id}`, payload);
      if (role === "resort_owner" && hasSubscription) {
        await updateAdminUserSubscription(user.id, {
          plan: subPlan,
          status: subStatus,
          next_due_date: subNextDue || null,
          billing_cycle_end: subCycleEnd || null,
        });
      }
      pushToast({ title: "User updated", description: `${name.trim()} has been updated.`, tone: "success" });
      onClose();
      onSaved?.();
    } catch (err) {
      pushToast({
        title: "Could not update user",
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
          <Pencil size={18} className="text-skyBlue" />
          Edit user
        </span>
      }
      description={user ? `Editing personal details for ${user.name}.` : ""}
      initialFocusSelector="#admin-edit-user-name"
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        {/* Name */}
        <div>
          <label htmlFor="admin-edit-user-name" className="mb-1.5 block text-xs font-semibold text-zinc-600">
            Full name
          </label>
          <input
            id="admin-edit-user-name"
            className="dash-input"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(sanitizePersonName(e.target.value))}
            placeholder="Legal name"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="admin-edit-user-email" className="mb-1.5 block text-xs font-semibold text-zinc-600">
            Email
          </label>
          <input
            id="admin-edit-user-email"
            className="dash-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(sanitizeEmailTyping(e.target.value).toLowerCase())}
            placeholder="you@example.com"
          />
        </div>

        {/* Role */}
        <div>
          <label htmlFor="admin-edit-user-role" className="mb-1.5 block text-xs font-semibold text-zinc-600">
            Role
          </label>
          <select
            id="admin-edit-user-role"
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

        {/* Phone */}
        <div>
          <label htmlFor="admin-edit-user-phone" className="mb-1.5 block text-xs font-semibold text-zinc-600">
            Phone <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            id="admin-edit-user-phone"
            className="dash-input"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+63 912 345 6789"
            maxLength={30}
          />
        </div>

        {/* Location */}
        <div>
          <p className="mb-1.5 block text-xs font-semibold text-zinc-600">
            Mailing location <span className="font-normal text-zinc-400">(optional)</span>
          </p>
          <PhilippineLocationPicker value={location} onChange={setLocation} idPrefix="admin-edit-user-loc" />
        </div>

        {role === "resort_owner" ? (
          <div className="rounded-xl border border-softBorder bg-zinc-50/80 p-4">
            <p className="mb-3 text-xs font-semibold text-zinc-700">Resort subscription</p>
            {subLoading ? (
              <p className="text-xs text-zinc-500">Loading subscription…</p>
            ) : hasSubscription ? (
              <div className="space-y-3">
                {resortName ? (
                  <p className="text-[11px] text-zinc-500">
                    Resort: <span className="font-medium text-zinc-700">{resortName}</span>
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="admin-edit-sub-plan" className="mb-1 block text-xs font-semibold text-zinc-600">
                      Plan
                    </label>
                    <select
                      id="admin-edit-sub-plan"
                      className="dash-input"
                      value={subPlan}
                      onChange={(e) => setSubPlan(e.target.value)}
                    >
                      <option value="standard">Standard</option>
                      <option value="business_pro">Business Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="admin-edit-sub-status" className="mb-1 block text-xs font-semibold text-zinc-600">
                      Status
                    </label>
                    <select
                      id="admin-edit-sub-status"
                      className="dash-input"
                      value={subStatus}
                      onChange={(e) => setSubStatus(e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="pending_payment">Pending payment</option>
                      <option value="grace_period">Grace period</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="admin-edit-sub-due" className="mb-1 block text-xs font-semibold text-zinc-600">
                      Next due date
                    </label>
                    <input
                      id="admin-edit-sub-due"
                      type="date"
                      className="dash-input"
                      value={subNextDue}
                      onChange={(e) => setSubNextDue(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="admin-edit-sub-cycle" className="mb-1 block text-xs font-semibold text-zinc-600">
                      Billing cycle end
                    </label>
                    <input
                      id="admin-edit-sub-cycle"
                      type="date"
                      className="dash-input"
                      value={subCycleEnd}
                      onChange={(e) => setSubCycleEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No resort workspace or subscription yet for this owner.</p>
            )}
          </div>
        ) : null}

        {role === "marketing" ? (
          <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-4">
            <p className="text-xs font-semibold text-violet-950">Booking commission (per paid online guest booking)</p>
            <p className="mt-1 text-[11px] text-violet-900/80">
              Leave unchecked to use the platform default (₱10 unless changed in System Settings).
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={useCustomBookingRate}
                onChange={(e) => {
                  setUseCustomBookingRate(e.target.checked);
                  if (!e.target.checked) setCustomBookingRate("");
                }}
              />
              <span className="text-sm text-zinc-800">Custom rate for this partner</span>
            </label>
            {useCustomBookingRate ? (
              <div className="mt-3">
                <label htmlFor="admin-edit-booking-rate" className="mb-1 block text-xs font-semibold text-zinc-600">
                  Amount (PHP)
                </label>
                <input
                  id="admin-edit-booking-rate"
                  className="dash-input"
                  type="number"
                  min={1}
                  max={5000}
                  step={0.01}
                  value={customBookingRate}
                  onChange={(e) => setCustomBookingRate(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* New password (optional) */}
        <div>
          <label htmlFor="admin-edit-user-password" className="mb-1.5 block text-xs font-semibold text-zinc-600">
            New password <span className="font-normal text-zinc-400">(leave blank to keep current)</span>
          </label>
          <div className="relative">
            <input
              id="admin-edit-user-password"
              className="dash-input pr-10"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password…"
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
          <p className="mt-1 text-[11px] text-zinc-400">
            If provided, must be at least 8 characters with uppercase, lowercase, and a number.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-softBorder pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="dash-btn-sm justify-center px-4 py-2.5 sm:min-w-[100px]"
            disabled={saving}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="dash-btn-primary justify-center px-6 py-2.5 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Saving…
              </span>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </DashModal>
  );
}
