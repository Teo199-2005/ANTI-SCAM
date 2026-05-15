"use client";

import AdminResortOnboardForm, {
  type AdminOnboardFormState,
} from "@/components/dashboard/AdminResortOnboardForm";
import type { PhilippineLocationValue } from "@/components/locations/PhilippineLocationPicker";
import { useToast } from "@/components/shared/ToastProvider";
import {
  adminOnboard,
  getAssignableOwners,
  uploadResortBackground,
  uploadResortLogo,
  type AssignableOwner,
} from "@/lib/api/admin";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { getResort, updateResort } from "@/lib/api/resort";
import {
  sanitizeAmenityListTyping,
  sanitizeBusinessOrResortName,
  sanitizeEmailTyping,
  sanitizeLongText,
  sanitizeNumericIdInput,
  sanitizePersonName,
  sanitizePhoneInput,
  sanitizeSubdomainInput,
} from "@/lib/inputRestrictions";
import { getPasswordPolicyChecks, passwordPolicyMet } from "@/lib/passwordStrength";
import { shrinkRasterForUpload } from "@/lib/uploads/shrinkRasterForUpload";
import { Building2, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const initial: AdminOnboardFormState = {
  tenant_name: "",
  resort_name: "",
  subdomain: "",
  address_province_psgc: null,
  address_city_municipality_psgc: null,
  address_barangay_psgc: null,
  address_barangay_name: null,
  address_street_line: "",
  map_latitude: null,
  map_longitude: null,
  contact_number: "",
  logo_url: "",
  background_image_url: "",
  description: "",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: "",
  representative_name: "",
  representative_contact_number: "",
  cancellation_policy: "",
  amenities: "",
  plan: "basic",
  owner_account_mode: "create",
  owner_name: "",
  owner_email: "",
  owner_password: "",
  owner_password_confirmation: "",
  owner_user_id: "",
  is_publicly_listed: true,
};

function amenitiesToArray(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminOnboardPage() {
  const { pushToast } = useToast();
  const params = useSearchParams();
  const resortIdParam = params.get("resort_id");
  const editResortId = resortIdParam ? Number(resortIdParam) : null;
  const isEditMode = Number.isFinite(editResortId) && (editResortId ?? 0) > 0;

  const [form, setForm] = useState<AdminOnboardFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [owners, setOwners] = useState<AssignableOwner[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [ownerLoadError, setOwnerLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptAdminTerms, setAcceptAdminTerms] = useState(false);

  const selectedOwnerEmail = useMemo(() => {
    if (form.owner_account_mode === "create") {
      return form.owner_email.trim() || null;
    }
    if (!form.owner_user_id) return null;
    return owners.find((o) => String(o.id) === form.owner_user_id)?.email ?? null;
  }, [form.owner_account_mode, form.owner_email, form.owner_user_id, owners]);

  const ownerAccountValid = useMemo(() => {
    if (isEditMode || form.owner_account_mode === "existing") return true;
    return (
      form.owner_name.trim().length > 0 &&
      form.owner_email.trim().length > 0 &&
      passwordPolicyMet(getPasswordPolicyChecks(form.owner_password)) &&
      form.owner_password === form.owner_password_confirmation
    );
  }, [form, isEditMode]);

  const update = (key: keyof AdminOnboardFormState, value: string | boolean) => {
    let next: string | boolean = value;
    if (typeof value === "string") {
      switch (key) {
        case "tenant_name":
        case "resort_name":
          next = sanitizeBusinessOrResortName(value);
          break;
        case "subdomain":
          next = sanitizeSubdomainInput(value);
          break;
        case "contact_number":
        case "representative_contact_number":
          next = sanitizePhoneInput(value);
          break;
        case "logo_url":
        case "background_image_url":
        case "facebook_url":
        case "instagram_url":
        case "tiktok_url":
          next = sanitizeLongText(value, 2048);
          break;
        case "description":
        case "cancellation_policy":
          next = sanitizeLongText(value);
          break;
        case "amenities":
          next = sanitizeAmenityListTyping(value);
          break;
        case "representative_name":
          next = sanitizePersonName(value);
          break;
        case "address_street_line":
          next = sanitizeLongText(value, 255);
          break;
        case "owner_name":
          next = sanitizePersonName(value);
          break;
        case "owner_email":
          next = sanitizeEmailTyping(value).toLowerCase();
          break;
        case "owner_user_id":
          next = sanitizeNumericIdInput(value, 12);
          break;
        default:
          break;
      }
    }
    setForm((prev) => {
      const updated = { ...prev, [key]: next };
      if (key === "owner_user_id" && typeof next === "string" && next) {
        const owner = owners.find((o) => String(o.id) === next);
        if (owner && !prev.representative_name.trim()) {
          updated.representative_name = owner.name;
        }
      }
      if (key === "owner_name" && typeof next === "string" && next && !prev.representative_name.trim()) {
        updated.representative_name = next;
      }
      return updated;
    });
  };

  useEffect(() => {
    if (!isEditMode || !editResortId) return;
    const hydrate = async () => {
      setInitializing(true);
      setError(null);
      try {
        const resort = await getResort(editResortId);
        const raw = resort as Record<string, unknown>;
        setForm({
          ...initial,
          resort_name: resort.name ?? "",
          address_province_psgc: resort.address_province_psgc ?? null,
          address_city_municipality_psgc: resort.address_city_municipality_psgc ?? null,
          address_barangay_psgc: resort.address_barangay_psgc ?? null,
          address_barangay_name: resort.address_barangay_name ?? null,
          address_street_line: resort.address_street_line ?? "",
          map_latitude: resort.map_latitude != null ? Number(resort.map_latitude) : null,
          map_longitude: resort.map_longitude != null ? Number(resort.map_longitude) : null,
          contact_number: resort.contact_number ?? "",
          logo_url: resort.logo_url ?? "",
          background_image_url: resort.background_image_url ?? "",
          description: resort.description ?? "",
          facebook_url: resort.facebook_url ?? "",
          instagram_url: resort.instagram_url ?? "",
          tiktok_url: resort.tiktok_url ?? "",
          representative_name: (raw.representative_name as string) ?? "",
          representative_contact_number: (raw.representative_contact_number as string) ?? "",
          cancellation_policy: (raw.cancellation_policy as string) ?? "",
          amenities: Array.isArray(resort.amenities) ? resort.amenities.join(", ") : "",
          is_publicly_listed: Boolean(resort.is_publicly_listed),
        });
      } catch {
        setError("Failed to load resort details for editing.");
      } finally {
        setInitializing(false);
      }
    };
    void hydrate();
  }, [editResortId, isEditMode]);

  useEffect(() => {
    if (isEditMode || form.owner_account_mode !== "existing") return;
    void fetchOwners();
  }, [isEditMode, form.owner_account_mode]);

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

  const buildResortPayload = () => ({
    description: form.description.trim() || null,
    address_province_psgc: form.address_province_psgc,
    address_city_municipality_psgc: form.address_city_municipality_psgc,
    address_barangay_name: form.address_barangay_name?.trim() || null,
    address_barangay_psgc: null,
    address_street_line: form.address_street_line.trim() || null,
    map_latitude: form.map_latitude,
    map_longitude: form.map_longitude,
    contact_number: form.contact_number.trim() || null,
    logo_url: form.logo_url.trim() || null,
    background_image_url: form.background_image_url.trim() || null,
    representative_name: form.representative_name.trim() || null,
    representative_contact_number: form.representative_contact_number.trim() || null,
    cancellation_policy: form.cancellation_policy.trim() || null,
    amenities: amenitiesToArray(form.amenities),
    facebook_url: form.facebook_url.trim() || null,
    instagram_url: form.instagram_url.trim() || null,
    tiktok_url: form.tiktok_url.trim() || null,
    is_publicly_listed: form.is_publicly_listed,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode && form.owner_account_mode === "create" && !ownerAccountValid) {
      pushToast({
        title: "Owner login incomplete",
        description: "Enter the owner name, email, and a password that meets the requirements.",
        tone: "warning",
      });
      return;
    }
    if (!isEditMode && form.owner_account_mode === "existing" && !form.owner_user_id) {
      pushToast({
        title: "Select an owner account",
        description: "Choose an unassigned resort owner or switch to Create new account.",
        tone: "warning",
      });
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      if (isEditMode && editResortId) {
        await updateResort(editResortId, {
          name: form.resort_name.trim(),
          ...buildResortPayload(),
        });
      } else {
        const ownerPayload =
          form.owner_account_mode === "create"
            ? {
                owner_name: form.owner_name.trim(),
                owner_email: form.owner_email.trim().toLowerCase(),
                owner_password: form.owner_password,
                owner_password_confirmation: form.owner_password_confirmation,
              }
            : { owner_user_id: Number(form.owner_user_id) };

        await adminOnboard({
          tenant_name: form.tenant_name.trim(),
          resort_name: form.resort_name.trim(),
          subdomain: form.subdomain.trim().toLowerCase(),
          plan: form.plan,
          accept_terms: true,
          ...ownerPayload,
          ...buildResortPayload(),
        });
      }
      const onboardedOwnerEmail =
        !isEditMode && form.owner_account_mode === "create" ? form.owner_email.trim().toLowerCase() : null;
      const onboardedExistingOwner = !isEditMode && form.owner_account_mode === "existing";

      setSuccess(true);
      if (!isEditMode) {
        setForm(initial);
        setAcceptAdminTerms(false);
      }
      pushToast({
        title: isEditMode ? "Resort updated" : "Resort onboarded",
        description: isEditMode
          ? "Resort profile details were updated successfully."
          : onboardedOwnerEmail
            ? `Resort is ready. The owner can sign in at the login page with ${onboardedOwnerEmail} and the password you set.`
            : onboardedExistingOwner
              ? "Tenant, resort, and subscription are ready. The owner signs in with the email and password from when their account was created."
              : "Tenant, resort, and subscription are ready.",
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
      const prepared = await shrinkRasterForUpload(file);
      const logoUrl = await uploadResortLogo(prepared);
      update("logo_url", logoUrl);
      pushToast({ title: "Logo uploaded", tone: "success" });
    } catch (err: unknown) {
      pushToast({ title: "Upload failed", description: parseApiErrorMessage(err, "Logo upload failed."), tone: "error" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const onBgSelected = async (file: File | null) => {
    if (!file) return;
    setUploadingBg(true);
    try {
      const prepared = await shrinkRasterForUpload(file);
      const url = await uploadResortBackground(prepared);
      update("background_image_url", url);
      pushToast({ title: "Cover image uploaded", tone: "success" });
    } catch (err: unknown) {
      pushToast({
        title: "Upload failed",
        description: parseApiErrorMessage(err, "Background upload failed."),
        tone: "error",
      });
    } finally {
      setUploadingBg(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="dash-page-header">
        <h1 className="dash-page-title flex items-center gap-2">
          <Building2 size={24} className="text-skyBlue" />
          {isEditMode ? "Edit resort profile" : "Onboard new resort"}
        </h1>
        <p className="dash-page-sub max-w-3xl">
          {isEditMode
            ? "Update the same fields owners manage in Resort profile — location, branding, social links, and listing settings."
            : "Create tenant, resort, and subscription in one step. Fill in branding and location now so the owner’s public page is closer to ready on day one."}
        </p>
      </div>

      <div className="dash-card p-6 lg:p-8">
        {initializing ? <p className="mb-4 text-sm text-zinc-600">Loading resort details…</p> : null}
        {success ? (
          <p className="mb-6 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
            {isEditMode
              ? "Saved. Review changes or continue editing this resort."
              : "Form cleared — you can onboard another resort, or check the toast for confirmation."}
          </p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800">{error}</p>
        ) : null}

        <form onSubmit={onSubmit}>
          <AdminResortOnboardForm
            form={form}
            isEditMode={isEditMode}
            saving={saving}
            uploadingLogo={uploadingLogo}
            uploadingBg={uploadingBg}
            owners={owners}
            loadingOwners={loadingOwners}
            ownerLoadError={ownerLoadError}
            selectedOwnerEmail={selectedOwnerEmail}
            acceptAdminTerms={acceptAdminTerms}
            onFetchOwners={() => void fetchOwners()}
            onChange={update}
            onLocationChange={(next: PhilippineLocationValue) => {
              setForm((prev) => ({
                ...prev,
                address_province_psgc: next.provinceCode,
                address_city_municipality_psgc: next.cityCode,
                address_barangay_name: next.barangayName,
              }));
            }}
            onMapPinChange={(lat, lng) => {
              setForm((prev) => ({ ...prev, map_latitude: lat, map_longitude: lng }));
            }}
            onLogoUpload={(file) => void onLogoSelected(file)}
            onBgUpload={(file) => void onBgSelected(file)}
            onAcceptTermsChange={setAcceptAdminTerms}
            ownerAccountValid={ownerAccountValid}
          />

          <div className="mt-8 border-t border-softBorder pt-6">
            <button
              type="submit"
              disabled={
                saving ||
                (!isEditMode &&
                  (!acceptAdminTerms ||
                    !ownerAccountValid ||
                    (form.owner_account_mode === "existing" &&
                      (loadingOwners || Boolean(ownerLoadError) || !form.owner_user_id))))
              }
              className="dash-btn-primary px-8 py-3 disabled:opacity-60"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {isEditMode ? "Saving changes…" : "Creating resort…"}
                </span>
              ) : isEditMode ? (
                "Save changes"
              ) : (
                "Onboard resort"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
