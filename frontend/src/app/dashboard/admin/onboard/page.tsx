"use client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";

import { useToast } from "@/components/shared/ToastProvider";
import { adminOnboard, AssignableOwner, getAssignableOwners, uploadResortLogo } from "@/lib/api/admin";
import { getResort, updateResort } from "@/lib/api/resort";
import { Building2, Globe, Image as ImageIcon, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1").replace(
  /\/api\/v1\/?$/,
  "",
);

type FormState = {
  tenant_name: string;
  resort_name: string;
  subdomain: string;
  address: string;
  contact_number: string;
  logo_url: string;
  description: string;
  plan: "basic";
  owner_user_id: string;
  is_publicly_listed: boolean;
};

const initial: FormState = {
  tenant_name: "",
  resort_name: "",
  subdomain: "",
  address: "",
  contact_number: "",
  logo_url: "",
  description: "",
  plan: "basic",
  owner_user_id: "",
  is_publicly_listed: true,
};

export default function AdminOnboardPage() {
  const { pushToast } = useToast();
  const params = useSearchParams();
  const resortIdParam = params.get("resort_id");
  const editResortId = resortIdParam ? Number(resortIdParam) : null;
  const isEditMode = Number.isFinite(editResortId) && (editResortId ?? 0) > 0;
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [owners, setOwners] = useState<AssignableOwner[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [ownerLoadError, setOwnerLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!isEditMode || !editResortId) return;
    const hydrate = async () => {
      setInitializing(true);
      setError(null);
      try {
        const resort = await getResort(editResortId);
        setForm((prev) => ({
          ...prev,
          tenant_name: "",
          resort_name: resort.name ?? "",
          subdomain: "",
          address: resort.address ?? "",
          contact_number: resort.contact_number ?? "",
          logo_url: resort.logo_url ?? "",
          description: resort.description ?? "",
          plan: "basic",
          is_publicly_listed: Boolean(resort.is_publicly_listed),
        }));
      } catch (err) {
        setError("Failed to load resort details for editing.");
      } finally {
        setInitializing(false);
      }
    };
    void hydrate();
  }, [editResortId, isEditMode]);

  useEffect(() => {
    if (isEditMode) return;
    void fetchOwners();
  }, [isEditMode]);

  const fetchOwners = async () => {
    setLoadingOwners(true);
    setOwnerLoadError(null);
    try {
      const data = await getAssignableOwners();
      setOwners(data);
      if (data.length === 0) {
        setOwnerLoadError("No unassigned resort owner accounts found.");
      }
    } catch {
      setOwners([]);
      setOwnerLoadError("Unable to load resort owner accounts. Please retry.");
    } finally {
      setLoadingOwners(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      if (isEditMode && editResortId) {
        await updateResort(editResortId, {
          name: form.resort_name.trim(),
          address: form.address.trim() || null,
          contact_number: form.contact_number.trim() || null,
          logo_url: form.logo_url.trim() || null,
          description: form.description.trim() || null,
          is_publicly_listed: form.is_publicly_listed,
        });
      } else {
        await adminOnboard({
          tenant_name: form.tenant_name.trim(),
          resort_name: form.resort_name.trim(),
          subdomain: form.subdomain.trim().toLowerCase(),
          address: form.address.trim() || undefined,
          contact_number: form.contact_number.trim() || undefined,
          logo_url: form.logo_url.trim() || undefined,
          description: form.description.trim() || undefined,
          plan: form.plan,
          owner_user_id: Number(form.owner_user_id),
          is_publicly_listed: form.is_publicly_listed,
        });
      }
      setSuccess(true);
      if (!isEditMode) {
        setForm(initial);
      }
      pushToast({
        title: isEditMode ? "Resort updated" : "Resort onboarded",
        description: isEditMode
          ? "Resort profile details were updated successfully."
          : "Tenant, resort, and subscription are ready. Share access with the owner.",
        tone: "success",
        durationMs: 5000,
      });
    } catch (err: unknown) {
      const msg = parseApiErrorMessage(err, "Onboarding failed. Check the inputs and try again.");
      setError(msg);
      pushToast({ title: "Onboarding failed", description: msg, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const onLogoSelected = async (file: File | null) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const logoUrl = await uploadResortLogo(file);
      update("logo_url", logoUrl);
      pushToast({ title: "Logo uploaded", tone: "success" });
    } catch (err: unknown) {
      const msg = parseApiErrorMessage(err, "Logo upload failed.");
      pushToast({ title: "Upload failed", description: msg, tone: "error" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const previewSrc = form.logo_url.trim()
    ? form.logo_url.trim().startsWith("/storage/")
      ? `${BACKEND_ORIGIN}${form.logo_url.trim()}`
      : form.logo_url.trim()
    : "";

  return (
    <div className="space-y-6">
      <div className="dash-page-header">
        <h1 className="dash-page-title flex items-center gap-2">
          <Building2 size={24} className="text-skyBlue" />
          {isEditMode ? "Edit resort profile" : "Onboard new resort"}
        </h1>
        <p className="dash-page-sub max-w-2xl">
          {isEditMode
            ? "Update resort listing fields, contact details, and visibility."
            : "Create a new tenant, resort, and subscription in a single step. The resort owner portal activates immediately after onboarding."}
        </p>
      </div>

      <div className="dash-card p-6 lg:p-8">
        {initializing ? (
          <p className="mb-4 text-sm text-zinc-600">Loading resort details…</p>
        ) : null}
        {success ? (
          <p className="mb-6 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
            {isEditMode
              ? "Saved. Review changes or continue editing this resort."
              : "Form cleared — you can onboard another resort, or check the toast for a quick confirmation."}
          </p>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>

          {/* Tenant / account name */}
          {!isEditMode ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Account / Tenant name *{" "}
              <span className="font-normal text-zinc-400">(used for login + billing)</span>
            </label>
            <input
              className="dash-input"
              required
              placeholder="Beach Paradise Properties"
              value={form.tenant_name}
              onChange={(e) => update("tenant_name", e.target.value)}
            />
          </div>
          ) : null}

          {/* Resort display name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Resort display name *{" "}
              <span className="font-normal text-zinc-400">(shown publicly)</span>
            </label>
            <input
              className="dash-input"
              required
              placeholder="Beach Paradise Resort"
              value={form.resort_name}
              onChange={(e) => update("resort_name", e.target.value)}
            />
          </div>

          {/* Subdomain */}
          {!isEditMode ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Subdomain *{" "}
              <span className="font-normal text-zinc-400">(e.g. beachparadise)</span>
            </label>
            <div className="relative">
              <Globe size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className="dash-input pl-9"
                required
                placeholder="beachparadise"
                pattern="[a-z0-9-]+"
                value={form.subdomain}
                onChange={(e) => update("subdomain", e.target.value.toLowerCase())}
              />
            </div>
          </div>
          ) : null}

          {/* Plan */}
          {!isEditMode ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Subscription plan *</label>
            <input className="dash-input" value="Standard plan set (durations selected by owner at checkout)" readOnly />
            <div className="mt-2 rounded-xl border border-softBorder bg-softGray/40 p-3 text-xs text-zinc-600">
              <p className="font-semibold text-navy">Current pricing model:</p>
              <p className="mt-1">Standard: 1M ₱2,300/mo, 3M ₱2,000/mo, 6M ₱1,900/mo, 12M ₱1,800/mo (+VAT).</p>
              <p className="mt-1">Referral: 1M ₱2,000/mo, 3M ₱1,800/mo, 6M ₱1,700/mo, 12M ₱1,500/mo (+VAT) with +1 bonus month.</p>
              <p className="mt-1">Owners choose duration and apply referral in the Subscribe modal.</p>
            </div>
          </div>
          ) : null}

          {/* Resort owner account */}
          {!isEditMode ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Resort owner account *</label>
            <select
              className="dash-input"
              required
              disabled={loadingOwners || Boolean(ownerLoadError)}
              value={form.owner_user_id}
              onChange={(e) => update("owner_user_id", e.target.value)}
            >
              <option value="">Select resort owner account</option>
              {owners.map((owner) => (
                <option key={owner.id} value={String(owner.id)}>
                  {owner.name} ({owner.email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Only unassigned resort owner accounts are shown.
            </p>
            {ownerLoadError ? (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-xs text-rose-600">{ownerLoadError}</p>
                <button type="button" className="dash-btn-sm" onClick={() => void fetchOwners()}>
                  Retry
                </button>
              </div>
            ) : null}
          </div>
          ) : null}

          {/* Address */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Address</label>
            <input
              className="dash-input"
              placeholder="BGC, Taguig City"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>

          {/* Contact */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Contact number</label>
            <input
              className="dash-input"
              placeholder="0917-874-4889"
              value={form.contact_number}
              onChange={(e) => update("contact_number", e.target.value)}
            />
          </div>

          {/* Resort logo upload */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Resort logo image{" "}
              <span className="font-normal text-zinc-400">(click to upload)</span>
            </label>
            <div className="relative space-y-2">
              <ImageIcon size={14} className="pointer-events-none absolute left-3 top-[14px] text-zinc-400" />
              <input
                className="dash-input pl-9"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void onLogoSelected(e.target.files?.[0] ?? null)}
              />
              {uploadingLogo ? <p className="text-xs text-zinc-500">Uploading image...</p> : null}
            </div>
          </div>

          {/* Logo preview */}
          <div className="sm:col-span-2">
            <div className="dash-inset">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Resort image preview</p>
              {form.logo_url.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt="Resort logo preview"
                  className="h-28 w-full rounded-xl border border-softBorder object-cover sm:h-36"
                />
              ) : (
                <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-softBorder bg-white/60 text-sm text-zinc-500 sm:h-36">
                  Upload a logo to preview the resort branding.
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Description</label>
            <textarea
              className="dash-input min-h-[80px] resize-none"
              placeholder="A short description of the resort…"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          {/* Publicly listed toggle */}
          <div className="sm:col-span-2 flex items-center gap-3">
            <input
              id="publicly-listed"
              type="checkbox"
              className="h-4 w-4 rounded border-softBorder accent-primaryBlue"
              checked={form.is_publicly_listed}
              onChange={(e) => update("is_publicly_listed", e.target.checked)}
            />
            <label htmlFor="publicly-listed" className="text-sm text-zinc-700">
              Publicly list this resort immediately after onboarding
            </label>
          </div>

          {/* Submit */}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving || (!isEditMode && (loadingOwners || Boolean(ownerLoadError)))}
              className="dash-btn-primary px-8 py-3 disabled:opacity-60"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> {isEditMode ? "Saving changes…" : "Creating resort…"}
                </span>
              ) : (
                isEditMode ? "Save changes" : "Onboard resort"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

