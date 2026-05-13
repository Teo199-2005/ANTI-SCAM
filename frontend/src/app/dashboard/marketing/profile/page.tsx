"use client";

import { PhilippineLocationPicker, type PhilippineLocationValue } from "@/components/locations/PhilippineLocationPicker";
import ChangePasswordCard from "@/components/dashboard/ChangePasswordCard";
import { useToast } from "@/components/shared/ToastProvider";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
import { getMarketingGovIdOptions, laravelStorageUrl, type MarketingGovIdOption } from "@/lib/api/marketingGovId";
import { formatRoleLabel } from "@/lib/utils";
import {
  Camera,
  CheckCircle2,
  Circle,
  FileUp,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Settings,
  User,
  Wallet,
} from "lucide-react";
import {
  sanitizeEmailTyping,
  sanitizeGovIdNumberInput,
  sanitizePersonName,
  sanitizePhilippinesMobileInput,
  sanitizeTinTyping,
} from "@/lib/inputRestrictions";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const GOV_DOC_MAX_BYTES = 5 * 1024 * 1024;
const GOV_DOC_ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

export default function MarketingProfilePage() {
  const { user, refreshUser } = useAuth();
  const { pushToast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [mailingLocation, setMailingLocation] = useState<PhilippineLocationValue>({
    provinceCode: user?.mailing_province_psgc ?? null,
    cityCode: user?.mailing_city_municipality_psgc ?? null,
    barangayName: user?.mailing_barangay_name ?? null,
  });
  const [tin, setTin] = useState("");
  const [saving, setSaving] = useState(false);

  // Avatar
  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [gcashNumber, setGcashNumber] = useState("");
  const [gcashHolder, setGcashHolder] = useState("");
  const [savingGcash, setSavingGcash] = useState(false);

  const [govOptions, setGovOptions] = useState<MarketingGovIdOption[]>([]);
  const [govIdType, setGovIdType] = useState("");
  const [govIdNumber, setGovIdNumber] = useState("");
  const [savingGovId, setSavingGovId] = useState(false);
  const [uploadingGovDoc, setUploadingGovDoc] = useState(false);
  /** After saving ID type+number, allow upload even if /me hasn’t returned masked yet (avoids stuck “Choose file”). */
  const [govIdSavedForUpload, setGovIdSavedForUpload] = useState(false);
  const govDocRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const opts = await getMarketingGovIdOptions();
        if (!cancelled) setGovOptions(opts);
      } catch {
        if (!cancelled) setGovOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? "");
      setMailingLocation({
        provinceCode: user.mailing_province_psgc ?? null,
        cityCode: user.mailing_city_municipality_psgc ?? null,
        barangayName: user.mailing_barangay_name ?? null,
      });
      setTin("");
      setGcashHolder(user.gcash_account_holder_name ?? "");
      setGcashNumber("");
      setGovIdType(user.marketer_gov_id_type ?? "");
      setGovIdNumber("");
    }
  }, [user]);

  useEffect(() => {
    if (!user?.marketer_gov_id_type) {
      setGovIdSavedForUpload(false);
      return;
    }
    if (govIdType !== user.marketer_gov_id_type) {
      setGovIdSavedForUpload(false);
    }
  }, [user?.marketer_gov_id_type, govIdType]);

  useEffect(() => {
    if (user?.marketer_gov_id_has_number || user?.marketer_gov_id_number_masked) {
      setGovIdSavedForUpload(false);
    }
  }, [user?.marketer_gov_id_has_number, user?.marketer_gov_id_number_masked]);

  const canUploadGovIdDocument =
    Boolean(user?.marketer_gov_id_type) &&
    Boolean(
      user?.marketer_gov_id_has_number ||
        user?.marketer_gov_id_number_masked ||
        govIdSavedForUpload,
    );

  const selectedGovOption = govOptions.find((o) => o.slug === govIdType);
  const govPlaceholder = selectedGovOption?.placeholder ?? user?.marketer_gov_id_placeholder ?? "ID number";
  const govFormatHint = selectedGovOption?.format_hint ?? user?.marketer_gov_id_format_hint ?? "";

  const payoutDetailsOk = Boolean(user?.gcash_payout_configured);
  const checklistItems = [
    { label: "Full name", ok: Boolean(user?.name?.trim()) },
    { label: "Philippine mailing location", ok: Boolean(user?.marketer_mailing_address?.trim()) },
    { label: "Valid government ID (type, number & upload)", ok: Boolean(user?.marketer_gov_id_complete) },
    { label: "TIN (strongly recommended)", ok: Boolean(user?.marketer_tin_masked) },
    { label: "Mobile number", ok: Boolean(user?.phone?.trim()) },
    { label: "Email", ok: Boolean(user?.email?.trim()) },
    { label: "GCash payout details (on file)", ok: payoutDetailsOk },
  ] as const;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch("/auth/profile", {
        name,
        email,
        phone: phone.trim() || "",
        mailing_province_psgc: mailingLocation.provinceCode,
        mailing_city_municipality_psgc: mailingLocation.cityCode,
        mailing_barangay_name: mailingLocation.barangayName?.trim() || "",
        mailing_barangay_psgc: null,
        marketer_tin: tin.trim() || "",
      });
      await refreshUser();
      setTin("");
      pushToast({ title: "Profile updated", description: "Your details were saved successfully.", tone: "success" });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg =
        axiosErr?.response?.data?.errors?.marketer_tin?.[0] ??
        axiosErr?.response?.data?.errors?.phone?.[0] ??
        axiosErr?.response?.data?.message ??
        "Something went wrong. Try again.";
      pushToast({
        title: "Couldn’t save profile",
        description: msg,
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const onSaveGovId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!govIdType.trim()) {
      pushToast({ title: "Select ID type", description: "Choose which government-issued ID you are using.", tone: "warning" });
      return;
    }
    if (!govIdNumber.trim()) {
      pushToast({ title: "ID number required", description: "Enter the number as shown on your ID.", tone: "warning" });
      return;
    }
    setSavingGovId(true);
    try {
      await apiClient.patch("/auth/profile", {
        marketer_gov_id_type: govIdType.trim(),
        marketer_gov_id_number: govIdNumber.trim(),
      });
      await refreshUser();
      setGovIdNumber("");
      setGovIdSavedForUpload(true);
      pushToast({ title: "ID details saved", description: "You can now upload a photo or scan of your ID.", tone: "success" });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg =
        axiosErr?.response?.data?.errors?.marketer_gov_id_number?.[0] ??
        axiosErr?.response?.data?.errors?.marketer_gov_id_type?.[0] ??
        axiosErr?.response?.data?.message ??
        "Could not save ID details.";
      pushToast({ title: "Save failed", description: msg, tone: "error" });
    } finally {
      setSavingGovId(false);
    }
  };

  const onGovDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!GOV_DOC_ALLOWED.has(file.type)) {
      pushToast({ title: "Invalid file", description: "Use PNG, JPG, WEBP, or PDF (max 5 MB).", tone: "warning" });
      e.target.value = "";
      return;
    }
    if (file.size > GOV_DOC_MAX_BYTES) {
      pushToast({ title: "File too large", description: "Maximum size is 5 MB.", tone: "warning" });
      e.target.value = "";
      return;
    }
    setUploadingGovDoc(true);
    try {
      const form = new FormData();
      form.append("document", file);
      await apiClient.post("/auth/marketing-gov-id-document", form);
      await refreshUser();
      pushToast({ title: "ID uploaded", description: "Your document was stored securely.", tone: "success" });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      pushToast({
        title: "Upload failed",
        description: axiosErr?.response?.data?.message ?? "Try again or use a smaller file.",
        tone: "error",
      });
    } finally {
      setUploadingGovDoc(false);
      e.target.value = "";
    }
  };

  const onSaveGcash = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGcash(true);
    try {
      const payload: Record<string, string> = {};
      if (gcashNumber.trim() !== "") {
        payload.gcash_account_number = gcashNumber.trim();
        payload.gcash_account_holder_name = gcashHolder.trim();
      } else if (gcashHolder.trim() !== "") {
        payload.gcash_account_holder_name = gcashHolder.trim();
      } else {
        pushToast({
          title: "Nothing to save",
          description: "Enter your GCash number and name, or update the account name only.",
          tone: "warning",
        });
        setSavingGcash(false);
        return;
      }
      await apiClient.patch("/auth/profile", payload);
      await refreshUser();
      setGcashNumber("");
      pushToast({
        title: "Payout details saved",
        description: "Your GCash information was updated. Use Xendit test mode until you go live.",
        tone: "success",
      });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg =
        axiosErr?.response?.data?.errors?.gcash_account_number?.[0] ??
        axiosErr?.response?.data?.errors?.gcash_account_holder_name?.[0] ??
        axiosErr?.response?.data?.message ??
        "Could not save GCash details.";
      pushToast({ title: "Save failed", description: msg, tone: "error" });
    } finally {
      setSavingGcash(false);
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
      pushToast({
        title: "Invalid image type",
        description: "Use PNG, JPG, or WebP for your profile photo.",
        tone: "warning",
      });
      e.target.value = "";
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      pushToast({
        title: "Image too large",
        description: "Please upload a photo up to 2 MB.",
        tone: "warning",
      });
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      await apiClient.post("/auth/avatar", form);
      await refreshUser();
      pushToast({ title: "Photo updated", description: "Your profile picture was uploaded.", tone: "success" });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      setAvatarPreview(null);
      pushToast({
        title: "Upload failed",
        description: axiosErr?.response?.data?.message ?? "Check the file type (PNG, JPG, WebP) and size (max 2 MB), then try again.",
        tone: "error",
      });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="space-y-6">
      <div className="dash-card p-6">
        <h1 className="dash-page-title inline-flex items-center gap-2">
          <Settings size={24} className="text-skyBlue" />
          Marketing profile
        </h1>
        <p className="dash-page-sub">
          Update your account details. Your display name is used to generate referral codes (surname + digits).
        </p>
        <div className="dash-inset mt-4 text-sm text-zinc-700">
          Referral codes and share links live on{" "}
          <Link href="/dashboard/marketing/referrals" className="font-semibold text-navy underline underline-offset-2 hover:text-primaryBlue">
            Referrals &amp; links
          </Link>
          .
        </div>
      </div>

      {/* KYC checklist */}
      <div className="dash-card p-6">
        <h2 className="mb-2 font-dash text-lg text-navy">Partner information checklist</h2>
        <p className="dash-page-sub mb-4">
          Complete these items so we can verify your account, meet payout compliance, and reach you if needed. Items update as you save each section.
        </p>
        <ul className="space-y-2.5">
          {checklistItems.map((item) => (
            <li key={item.label} className="flex items-start gap-2.5 text-sm">
              {item.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" aria-hidden />
              )}
              <span className={item.ok ? "text-zinc-800" : "text-zinc-600"}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Avatar */}
      <div className="dash-card p-6">
        <h2 className="mb-4 font-dash text-lg text-navy">Profile photo</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Avatar preview" className="h-16 w-16 rounded-full object-cover ring-2 ring-skyBlue/30" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slateBlue to-navy text-lg font-bold text-white">
                {initials}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-softCard/80">
                <Loader2 size={16} className="animate-spin text-navy" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="dash-btn-sm inline-flex items-center gap-2"
              disabled={uploadingAvatar}
            >
              <Camera size={14} />
              {uploadingAvatar ? "Uploading…" : "Upload photo"}
            </button>
            <p className="mt-1 text-xs text-zinc-500">PNG, JPG or WEBP · max 2 MB</p>
            <input
              ref={avatarRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={onAvatarChange}
              aria-label="Upload profile photo"
            />
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="dash-card p-6">
        <h2 className="mb-4 font-dash text-lg text-navy">Personal &amp; contact</h2>
        <p className="dash-page-sub mb-4">
          Use your legal name and a mailing address where you can receive correspondence. Your <strong className="font-semibold text-navy">TIN</strong> is
          strongly recommended for tax and payout reporting.
        </p>
        <form className="space-y-4" onSubmit={onSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="marketing-profile-name" className="mb-1.5 block text-xs font-semibold text-zinc-600">Full name</label>
              <div className="relative">
                <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  id="marketing-profile-name"
                  className="dash-input pl-9"
                  value={name}
                  onChange={(e) => setName(sanitizePersonName(e.target.value))}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="marketing-profile-email" className="mb-1.5 block text-xs font-semibold text-zinc-600">Email</label>
              <div className="relative">
                <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  id="marketing-profile-email"
                  className="dash-input pl-9"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(sanitizeEmailTyping(e.target.value).toLowerCase())}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="marketing-profile-phone" className="mb-1.5 block text-xs font-semibold text-zinc-600">Mobile number</label>
              <div className="relative">
                <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  id="marketing-profile-phone"
                  className="dash-input pl-9"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="09xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhilippinesMobileInput(e.target.value))}
                  pattern="[0-9]*"
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">Primary contact number (may differ from your GCash wallet number).</p>
            </div>

            <div className="md:col-span-2">
              <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                <MapPin size={14} className="text-zinc-500" />
                Philippine mailing location
              </div>
              <PhilippineLocationPicker
                idPrefix="marketing-profile"
                disabled={saving}
                legacyBarangayCodeHint={Boolean(
                  user?.mailing_barangay_psgc && !user?.mailing_barangay_name?.trim(),
                )}
                value={mailingLocation}
                onChange={setMailingLocation}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="marketing-profile-tin" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Tax identification number (TIN) <span className="font-normal text-amber-800">— strongly recommended</span>
              </label>
              <input
                id="marketing-profile-tin"
                className="dash-input max-w-md font-mono text-sm"
                inputMode="numeric"
                autoComplete="off"
                placeholder="9–12 digits (BIR TIN)"
                value={tin}
                onChange={(e) => setTin(sanitizeTinTyping(e.target.value))}
                pattern="[0-9]*"
              />
              {user?.marketer_tin_masked ? (
                <p className="mt-1 text-[11px] text-zinc-500">
                  On file: <span className="font-mono">{user.marketer_tin_masked}</span> — enter the full TIN above to replace, or clear the field and save to remove.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-zinc-500">Digits only (spaces or dashes are OK; we store the normalized number securely).</p>
              )}
            </div>

            <div className="dash-inset md:col-span-2">
              <p>
                <span className="font-semibold text-navy">Role:</span> {formatRoleLabel(user?.role)}
              </p>
            </div>

            <div className="md:col-span-2">
              <button type="submit" disabled={saving} className="dash-btn-primary disabled:opacity-60">
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Saving…
                  </span>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Government ID verification */}
      <div className="dash-card p-6">
        <h2 className="mb-2 font-dash text-lg text-navy inline-flex items-center gap-2">
          <IdCard size={22} className="text-skyBlue" />
          Government-issued ID
        </h2>
        <p className="dash-page-sub mb-4">
          We use this to verify marketing partners for compliance and payouts. Choose your ID type first — the examples below update to match what you selected.
        </p>

        <form className="space-y-4" onSubmit={onSaveGovId}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="gov-id-type" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                ID type
              </label>
              <select
                id="gov-id-type"
                className="dash-input"
                value={govIdType}
                onChange={(e) => setGovIdType(e.target.value)}
              >
                <option value="">Select one…</option>
                {govOptions.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="gov-id-number" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                ID number
              </label>
              <input
                id="gov-id-number"
                className="dash-input font-mono text-sm"
                autoComplete="off"
                placeholder={govPlaceholder}
                value={govIdNumber}
                onChange={(e) => setGovIdNumber(sanitizeGovIdNumberInput(e.target.value))}
              />
              {user?.marketer_gov_id_number_masked ? (
                <p className="mt-1 text-[11px] text-zinc-500">
                  On file: <span className="font-mono">{user.marketer_gov_id_number_masked}</span> — enter the full number above to replace.
                </p>
              ) : null}
            </div>

            {govIdType ? (
              <div className="md:col-span-2 rounded-lg border border-skyBlue/25 bg-sky-50/80 px-3 py-2.5 text-xs text-zinc-800">
                <p className="font-semibold text-navy">Format for: {selectedGovOption?.label ?? user?.marketer_gov_id_label ?? govIdType}</p>
                <p className="mt-1 leading-relaxed">
                  <span className="text-zinc-600">Example / placeholder: </span>
                  <span className="font-mono font-medium text-zinc-900">{govPlaceholder}</span>
                </p>
                {govFormatHint ? <p className="mt-1.5 text-zinc-700">{govFormatHint}</p> : null}
              </div>
            ) : null}

            <div className="md:col-span-2">
              <button type="submit" disabled={savingGovId} className="dash-btn-primary disabled:opacity-60">
                {savingGovId ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Saving…
                  </span>
                ) : (
                  "Save ID type & number"
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 border-t border-zinc-200/80 pt-6">
          <h3 className="mb-2 flex items-center gap-2 font-dash text-sm font-semibold text-navy">
            <FileUp size={16} className="text-skyBlue" />
            Upload ID (photo or scan)
          </h3>
          <p className="mb-3 text-xs text-zinc-600">
            Save your ID type and number first. PNG, JPG, WEBP, or PDF · max 5 MB. Changing ID type will require a new upload.
          </p>
          {user?.marketer_gov_id_document_url ? (
            <p className="mb-2 text-xs text-zinc-600">
              <a
                href={laravelStorageUrl(user.marketer_gov_id_document_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-clOcean underline underline-offset-2 hover:text-clOceanHover"
              >
                View uploaded file
              </a>
            </p>
          ) : null}
          <button
            type="button"
            disabled={uploadingGovDoc || !canUploadGovIdDocument}
            title={
              uploadingGovDoc
                ? undefined
                : !user?.marketer_gov_id_type
                  ? "Select ID type, enter the number, and click Save"
                  : !canUploadGovIdDocument
                    ? "Save your ID type and number first, then upload"
                    : undefined
            }
            className="dash-btn-sm inline-flex items-center gap-2 disabled:pointer-events-none disabled:opacity-50"
            onClick={() => govDocRef.current?.click()}
          >
            {uploadingGovDoc ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            {uploadingGovDoc ? "Uploading…" : "Choose file"}
          </button>
          <input
            ref={govDocRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="sr-only"
            onChange={onGovDocChange}
            aria-label="Upload government ID document"
          />
          {user?.marketer_gov_id_complete ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">ID verification details are complete.</p>
          ) : null}
        </div>
      </div>

      {/* GCash payouts */}
      <div className="dash-card p-6">
        <h2 className="mb-2 font-dash text-lg text-navy inline-flex items-center gap-2">
          <Wallet size={22} className="text-skyBlue" />
          Payout details: GCash
        </h2>
        <p className="dash-page-sub mb-4">
          Automated commissions are paid to your <strong className="font-semibold text-navy">GCash wallet</strong> on the <strong>10th of each month</strong>{" "}
          (Asia/Manila) when platform automation is on. Add the mobile number and account name that match your GCash registration.
        </p>
        <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          <strong>Test mode:</strong> In Xendit test mode, disbursements are simulated. Fund your test payout balance in the Xendit dashboard
          before expecting successful transfers.
        </div>
        {user?.gcash_payout_configured ? (
          <p className="mb-3 text-sm text-zinc-600">
            <span className="font-semibold text-navy">GCash on file:</span> {user.gcash_masked_number ?? "GCash number"} ·{" "}
            {user.gcash_account_holder_name ?? "—"}
          </p>
        ) : (
          <p className="mb-3 text-sm text-rose-700">Add your GCash number and account name to receive automated payouts.</p>
        )}
        <h3 className="mb-2 mt-2 font-dash text-sm font-semibold text-navy">GCash wallet</h3>
        <form className="space-y-4" onSubmit={onSaveGcash}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="gcash-number" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                GCash mobile number
              </label>
              <input
                id="gcash-number"
                className="dash-input"
                inputMode="numeric"
                autoComplete="off"
                placeholder={user?.gcash_masked_number ? "Enter full number to replace on file" : "09xxxxxxxxx"}
                value={gcashNumber}
                onChange={(e) => setGcashNumber(sanitizePhilippinesMobileInput(e.target.value))}
                pattern="[0-9]*"
              />
              <p className="mt-1 text-[11px] text-zinc-500">Philippines format 09xxxxxxxxx. Leave blank to only update the name on file.</p>
            </div>
            <div>
              <label htmlFor="gcash-holder" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Account holder name
              </label>
              <input
                id="gcash-holder"
                className="dash-input"
                autoComplete="name"
                placeholder="Name on GCash"
                value={gcashHolder}
                onChange={(e) => setGcashHolder(sanitizePersonName(e.target.value, 120))}
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={savingGcash} className="dash-btn-primary disabled:opacity-60">
                {savingGcash ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Saving…
                  </span>
                ) : (
                  "Save GCash details"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <ChangePasswordCard
        idPrefix="marketing-profile"
        description={
          <>
            Update your marketing partner login password. Use at least 8 characters with uppercase, lowercase, and a number.
            Other sessions will be signed out.
          </>
        }
      />
    </div>
  );
}
