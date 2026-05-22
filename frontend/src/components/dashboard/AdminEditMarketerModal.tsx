"use client";

import DashModal from "@/components/dash/DashModal";
import { PhilippineLocationPicker, type PhilippineLocationValue } from "@/components/locations/PhilippineLocationPicker";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { formatPhp } from "@/lib/formatPhp";
import { sanitizeEmailTyping, sanitizePersonName } from "@/lib/inputRestrictions";
import { normalizeProvinceCodeForDisplay } from "@/lib/locations/phLocationApiCache";
import { Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

export type AdminEditableMarketer = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  mailing_province_psgc?: string | null;
  mailing_city_municipality_psgc?: string | null;
  mailing_barangay_name?: string | null;
  booking_commission_php?: number | null;
  current_commission_per_booking_php?: number;
  uses_custom_booking_commission?: boolean;
};

type Props = {
  open: boolean;
  marketer: AdminEditableMarketer | null;
  platformDefaultPhp?: number;
  onClose: () => void;
  onSaved?: () => void;
};

type UserApiRow = {
  name?: string;
  email?: string;
  phone?: string | null;
  mailing_province_psgc?: string | null;
  mailing_city_municipality_psgc?: string | null;
  mailing_barangay_name?: string | null;
  booking_commission_php?: number | null;
};

export default function AdminEditMarketerModal({
  open,
  marketer,
  platformDefaultPhp = 10,
  onClose,
  onSaved,
}: Props) {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<PhilippineLocationValue>({
    provinceCode: null,
    cityCode: null,
    barangayName: null,
  });
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !marketer) return;

    setName(marketer.name ?? "");
    setEmail(marketer.email ?? "");
    setPhone(marketer.phone ?? "");
    setLocation({
      provinceCode: normalizeProvinceCodeForDisplay(marketer.mailing_province_psgc ?? null),
      cityCode: marketer.mailing_city_municipality_psgc ?? null,
      barangayName: marketer.mailing_barangay_name ?? null,
    });

    const hasCustom =
      marketer.uses_custom_booking_commission ??
      (marketer.booking_commission_php != null && marketer.booking_commission_php > 0);
    setUseCustomRate(hasCustom);
    setCustomRate(
      hasCustom && marketer.booking_commission_php != null
        ? String(marketer.booking_commission_php)
        : "",
    );

    setLoading(true);
    void apiClient
      .get<{ data: UserApiRow }>(`/users/${marketer.id}`)
      .then(({ data }) => {
        const u = data.data;
        if (!u) return;
        setName(u.name ?? marketer.name);
        setEmail(u.email ?? marketer.email);
        setPhone(u.phone ?? "");
        setLocation({
          provinceCode: normalizeProvinceCodeForDisplay(u.mailing_province_psgc ?? null),
          cityCode: u.mailing_city_municipality_psgc ?? null,
          barangayName: u.mailing_barangay_name ?? null,
        });
        const custom = u.booking_commission_php != null;
        setUseCustomRate(custom);
        setCustomRate(custom ? String(u.booking_commission_php) : "");
      })
      .catch(() => {
        /* keep row snapshot */
      })
      .finally(() => setLoading(false));
  }, [open, marketer]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketer) return;

    let bookingCommission: number | null = null;
    if (useCustomRate) {
      const parsed = Number(String(customRate).replace(/,/g, "").trim());
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5000) {
        pushToast({
          title: "Invalid commission",
          description: "Enter an amount between ₱1 and ₱5,000, or use the platform default.",
          tone: "error",
        });
        return;
      }
      bookingCommission = Math.round(parsed * 100) / 100;
    }

    setSaving(true);
    try {
      await apiClient.put(`/users/${marketer.id}`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: "marketing",
        phone: phone.trim() || null,
        mailing_province_psgc: location.provinceCode || null,
        mailing_city_municipality_psgc: location.cityCode || null,
        mailing_barangay_name: location.barangayName?.trim() || null,
        booking_commission_php: bookingCommission,
      });
      pushToast({
        title: "Marketing partner updated",
        description: useCustomRate
          ? `${name.trim()} — ${formatPhp(bookingCommission ?? 0)} per booking.`
          : `${name.trim()} — platform default ${formatPhp(platformDefaultPhp)} per booking.`,
        tone: "success",
      });
      onClose();
      onSaved?.();
    } catch (err) {
      pushToast({
        title: "Could not save",
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
          Edit marketing partner
        </span>
      }
      description={marketer ? `Update profile and per-booking commission for ${marketer.name}.` : ""}
      initialFocusSelector="#admin-edit-marketer-name"
    >
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-zinc-600">
          <Loader2 size={16} className="animate-spin" aria-hidden />
          Loading partner details…
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="admin-edit-marketer-name" className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Full name
            </label>
            <input
              id="admin-edit-marketer-name"
              className="dash-input"
              required
              value={name}
              onChange={(e) => setName(sanitizePersonName(e.target.value))}
            />
          </div>

          <div>
            <label htmlFor="admin-edit-marketer-email" className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Email
            </label>
            <input
              id="admin-edit-marketer-email"
              className="dash-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(sanitizeEmailTyping(e.target.value).toLowerCase())}
            />
          </div>

          <div>
            <label htmlFor="admin-edit-marketer-phone" className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Phone <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="admin-edit-marketer-phone"
              className="dash-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
            />
          </div>

          <div>
            <p className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Mailing location <span className="font-normal text-zinc-400">(optional)</span>
            </p>
            <PhilippineLocationPicker value={location} onChange={setLocation} idPrefix="admin-edit-marketer-loc" />
          </div>

          <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-4">
            <p className="text-xs font-semibold text-violet-950">Booking commission (per paid online guest booking)</p>
            <p className="mt-1 text-[11px] leading-relaxed text-violet-900/80">
              Platform default is <strong>{formatPhp(platformDefaultPhp)}</strong>. Only change this partner if they have a
              custom rate. New booking credits use the rate at credit time — existing pending rows are not recalculated.
            </p>

            <label className="mt-3 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={useCustomRate}
                onChange={(e) => {
                  setUseCustomRate(e.target.checked);
                  if (!e.target.checked) setCustomRate("");
                }}
              />
              <span className="text-sm text-zinc-800">Use custom commission for this partner</span>
            </label>

            {useCustomRate ? (
              <div className="mt-3">
                <label htmlFor="admin-edit-marketer-rate" className="mb-1 block text-xs font-semibold text-zinc-600">
                  Amount (PHP)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    ₱
                  </span>
                  <input
                    id="admin-edit-marketer-rate"
                    className="dash-input pl-8"
                    type="number"
                    min={1}
                    max={5000}
                    step={0.01}
                    required={useCustomRate}
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder={String(platformDefaultPhp)}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm font-medium text-violet-900">
                Effective rate: {formatPhp(platformDefaultPhp)} (platform default)
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-softBorder pt-4">
            <button type="button" className="dash-btn-sm border border-zinc-200 bg-white" onClick={handleClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              className="dash-btn-primary justify-center px-6 py-2.5 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                  Saving…
                </span>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      )}
    </DashModal>
  );
}
