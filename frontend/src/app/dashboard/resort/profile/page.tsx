"use client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import ChangePasswordCard from "@/components/dashboard/ChangePasswordCard";
import { LegalLinkButton } from "@/components/legal/LegalLinkButton";
import { useToast } from "@/components/shared/ToastProvider";
import { listResorts, ownerOnboardResort, updateResort, uploadOwnerResortLogo } from "@/lib/api/resort";
import {
  getOwnerLandingPage,
  LANDING_MISSING_FIELD_LABELS,
  uploadBgImage,
  type OwnerLandingPageResponse,
} from "@/lib/api/landingPage";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { resortPublicLandingPageUrl } from "@/lib/urls/resortPublicLandingUrl";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Upload,
  User,
  UserRoundCheck,
  Waves,
  XCircle,
} from "lucide-react";
import {
  sanitizeAddressLine,
  sanitizeAmenityListTyping,
  sanitizeBusinessOrResortName,
  sanitizeEmailTyping,
  sanitizeLongText,
  sanitizePersonName,
  sanitizePhoneInput,
} from "@/lib/inputRestrictions";
import Link from "next/link";
import { useEffect, useState } from "react";

type FormState = {
  id: number;
  name: string;
  description: string;
  address: string;
  contact_number: string;
  is_publicly_listed: boolean;
  cancellation_policy: string;
  amenities: string;
  logo_url: string;
  background_image_url: string;
  owner_name: string;
  owner_contact_number: string;
  representative_name: string;
  representative_email: string;
  representative_contact_number: string;
};

function RequiredBadge() {
  return <span className="ml-1 text-rose-500">*</span>;
}

export default function ResortProfilePage() {
  const { user, refreshUser } = useAuth();
  const { pushToast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [onboardingGate, setOnboardingGate] = useState(false);
  const [acceptOnboardTerms, setAcceptOnboardTerms] = useState(false);
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  /** Same readiness rules as the public `/resort/{slug}` page (includes active room + photo). */
  const [ownerLanding, setOwnerLanding] = useState<OwnerLandingPageResponse | null>(null);

  const publicLink =
    subdomain && typeof window !== "undefined" ? resortPublicLandingPageUrl(subdomain) : "";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setOnboardingGate(false);
      try {
        const resorts = await listResorts({ perPage: 10 });
        const first = resorts.data[0];
        if (!first) {
          if (user?.role === "resort_owner") {
            setOnboardingGate(true);
            setForm(null);
            setOwnerLanding(null);
            setSubdomain(null);
            setError(null);
            setLoading(false);
            return;
          }
          setError("No resort assigned to this account.");
          setOwnerLanding(null);
          setSubdomain(null);
          setLoading(false);
          return;
        }
        const raw = first as Record<string, unknown>;

        let ownerSubdomain: string | null = null;
        let landing: OwnerLandingPageResponse | null = null;
        try {
          landing = await getOwnerLandingPage();
          ownerSubdomain = landing.subdomain ?? null;
        } catch {
          landing = null;
        }
        setSubdomain(ownerSubdomain);
        setOwnerLanding(landing);

        setForm({
          id: first.id,
          name: first.name,
          description: first.description ?? "",
          address: first.address ?? "",
          contact_number: first.contact_number ?? "",
          is_publicly_listed: first.is_publicly_listed,
          cancellation_policy: (raw.cancellation_policy as string) ?? "",
          amenities: Array.isArray(raw.amenities)
            ? (raw.amenities as string[]).join(", ")
            : ((raw.amenities as string) ?? ""),
          logo_url: first.logo_url ?? "",
          background_image_url: (raw.background_image_url as string) ?? "",
          owner_name: user?.name ?? "",
          owner_contact_number: user?.phone ?? "",
          representative_name: (raw.representative_name as string) ?? "",
          representative_email: user?.email ?? "",
          representative_contact_number: (raw.representative_contact_number as string) ?? "",
        });
        setError(null);
      } catch (err) {
        setOwnerLanding(null);
        setSubdomain(null);
        setError(parseApiErrorMessage(err, "Unable to load resort profile."));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [refreshUser, user?.email, user?.name, user?.phone, user?.role]);

  const completeOwnerOnboarding = async () => {
    if (!user?.name || !acceptOnboardTerms) return;
    const ownerLabel = (user.name ?? "Resort Owner").trim();
    setOnboardingBusy(true);
    try {
      await ownerOnboardResort({
        tenant_name: ownerLabel,
        resort_name: `${ownerLabel}'s Resort`,
        is_publicly_listed: false,
        accept_terms: true,
      });
      await refreshUser();
      setAcceptOnboardTerms(false);
      setOnboardingGate(false);
      setLoading(true);
      const resorts = await listResorts({ perPage: 10 });
      const first = resorts.data[0];
      if (!first) {
        setError("Resort was created but could not be loaded. Refresh the page.");
        setLoading(false);
        return;
      }
      const raw = first as Record<string, unknown>;
      let ownerSubdomain: string | null = null;
      let landing: OwnerLandingPageResponse | null = null;
      try {
        landing = await getOwnerLandingPage();
        ownerSubdomain = landing.subdomain ?? null;
      } catch {
        landing = null;
      }
      setSubdomain(ownerSubdomain);
      setOwnerLanding(landing);
      setForm({
        id: first.id,
        name: first.name,
        description: first.description ?? "",
        address: first.address ?? "",
        contact_number: first.contact_number ?? "",
        is_publicly_listed: first.is_publicly_listed,
        cancellation_policy: (raw.cancellation_policy as string) ?? "",
        amenities: Array.isArray(raw.amenities)
          ? (raw.amenities as string[]).join(", ")
          : ((raw.amenities as string) ?? ""),
        logo_url: first.logo_url ?? "",
        background_image_url: (raw.background_image_url as string) ?? "",
        owner_name: user?.name ?? "",
        owner_contact_number: user?.phone ?? "",
        representative_name: (raw.representative_name as string) ?? "",
        representative_email: user?.email ?? "",
        representative_contact_number: (raw.representative_contact_number as string) ?? "",
      });
      setError(null);
      pushToast({
        title: "Workspace ready",
        description: "Your resort workspace was created. A copy of the Terms was sent to your email.",
        tone: "success",
      });
    } catch (err) {
      pushToast({
        title: "Onboarding failed",
        description: parseApiErrorMessage(err, "Could not create your resort workspace."),
        tone: "error",
      });
    } finally {
      setOnboardingBusy(false);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dash-card p-8 text-center text-zinc-600">Loading resort profile…</div>;
  }

  if (onboardingGate && user?.role === "resort_owner") {
    return (
      <div className="dash-card max-w-xl p-8">
        <h1 className="dash-page-title inline-flex items-center gap-2">
          <Building2 size={24} className="text-skyBlue" />
          Accept terms to continue
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Before we create your resort workspace, please confirm you have read and agree to the{" "}
          <BrandWordmark tone="onLight" size="xs" className="inline" /> Terms & Conditions. A full copy will be
          emailed to you for your records.
        </p>
        <label className="mt-6 flex items-start gap-3 rounded-xl border border-softBorder bg-softGray/30 p-4 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-softBorder accent-primaryBlue"
            checked={acceptOnboardTerms}
            onChange={(e) => setAcceptOnboardTerms(e.target.checked)}
          />
          <span>
            I have read and agree to the <LegalLinkButton kind="terms">Terms &amp; Conditions</LegalLinkButton>.
          </span>
        </label>
        <button
          type="button"
          disabled={!acceptOnboardTerms || onboardingBusy}
          className="dash-btn-primary mt-6 px-6 py-2.5 disabled:opacity-50"
          onClick={() => void completeOwnerOnboarding()}
        >
          {onboardingBusy ? "Creating workspace…" : "Create my resort workspace"}
        </button>
      </div>
    );
  }

  if (!form || error) {
    return (
      <div className="dash-card border-rose-200/80 bg-rose-50/90 p-8 text-rose-800">
        {error ?? "Resort profile unavailable."}
      </div>
    );
  }

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    let next = value;
    if (typeof value === "string") {
      switch (key) {
        case "name":
          next = sanitizeBusinessOrResortName(value) as FormState[K];
          break;
        case "owner_name":
        case "representative_name":
          next = sanitizePersonName(value) as FormState[K];
          break;
        case "contact_number":
        case "owner_contact_number":
        case "representative_contact_number":
          next = sanitizePhoneInput(value) as FormState[K];
          break;
        case "representative_email":
          next = sanitizeEmailTyping(value).toLowerCase() as FormState[K];
          break;
        case "address":
          next = sanitizeAddressLine(value) as FormState[K];
          break;
        case "description":
        case "cancellation_policy":
          next = sanitizeLongText(value) as FormState[K];
          break;
        case "amenities":
          next = sanitizeAmenityListTyping(value) as FormState[K];
          break;
        default:
          break;
      }
    }
    setForm((prev) => (prev ? { ...prev, [key]: next } : prev));
  };

  const landingReady = Boolean(ownerLanding?.is_ready);
  const landingMissingLabels =
    ownerLanding?.missing_fields?.map((k) => LANDING_MISSING_FIELD_LABELS[k] ?? k) ?? [];
  const emailVerified = Boolean(user?.email_verified_at);

  const refreshOwnerLanding = async () => {
    try {
      const landing = await getOwnerLandingPage();
      setOwnerLanding(landing);
      setSubdomain(landing.subdomain ?? null);
    } catch {
      setOwnerLanding(null);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateResort(form.id, {
        name: form.name,
        description: form.description || null,
        address: form.address || null,
        contact_number: form.contact_number || null,
        logo_url: form.logo_url || null,
        background_image_url: form.background_image_url || null,
        representative_name: form.representative_name || null,
        representative_contact_number: form.representative_contact_number || null,
        is_publicly_listed: form.is_publicly_listed,
        cancellation_policy: form.cancellation_policy || null,
        amenities: form.amenities
          ? form.amenities.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      } as Parameters<typeof updateResort>[1]);
      await apiClient.patch("/auth/profile", {
        name: form.owner_name,
        email: form.representative_email,
        phone: form.owner_contact_number || null,
      });
      await refreshUser();
      await refreshOwnerLanding();
      pushToast({ title: "Resort profile saved", description: "Your property details were updated.", tone: "success" });
    } catch (err) {
      pushToast({
        title: "Save failed",
        description: parseApiErrorMessage(err, "We couldn't update the resort profile. Try again."),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const onLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !form) return;
    setUploadingLogo(true);
    try {
      const logoUrl = await uploadOwnerResortLogo(file);
      setForm({ ...form, logo_url: logoUrl });
      await refreshOwnerLanding();
      pushToast({
        title: "Logo uploaded",
        description: "Saved to your resort. You can still use Save profile for other fields.",
        tone: "success",
      });
    } catch (err) {
      pushToast({
        title: "Logo upload failed",
        description: parseApiErrorMessage(err, "Please try another image."),
        tone: "error",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const onBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !form) return;
    setUploadingBg(true);
    try {
      const url = await uploadBgImage(file);
      setForm({ ...form, background_image_url: url });
      await refreshOwnerLanding();
      pushToast({
        title: "Background image uploaded",
        description: "Saved to your resort. Use Save profile for text fields if you changed them.",
        tone: "success",
      });
    } catch (err) {
      pushToast({
        title: "Upload failed",
        description: parseApiErrorMessage(err, "Please try another image."),
        tone: "error",
      });
    } finally {
      setUploadingBg(false);
    }
  };

  const copyLink = async () => {
    if (!publicLink) {
      pushToast({ title: "Link unavailable", description: "Subdomain not found yet.", tone: "error" });
      return;
    }
    await navigator.clipboard.writeText(publicLink);
    pushToast({ title: "Copied", description: "Resort link copied to clipboard.", tone: "success" });
  };

  return (
    <div className="space-y-6">
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="dash-card p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="dash-page-title inline-flex items-center gap-2">
            <Building2 size={24} className="text-skyBlue" />
            Resort profile
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              emailVerified
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {emailVerified ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {emailVerified ? "Email verified" : "Email not verified"}
          </span>
        </div>
        <p className="dash-page-sub">Update your property details. Fields marked <span className="text-rose-500">*</span> are required for your landing page.</p>
      </div>

      {/* Landing page readiness — matches public API (includes ≥1 active room with a photo). */}
      {form && ownerLanding === null && !loading && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Could not load landing checklist from the server. Refresh the page, or open{" "}
            <Link href="/dashboard/resort/rooms" className="font-semibold underline">
              Rooms
            </Link>{" "}
            and confirm you have at least one <strong>active</strong> room with a <strong>photo</strong> — that is
            required for the public page.
          </span>
        </div>
      )}
      {form && ownerLanding && !landingReady && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Your public landing page is not live yet. Still needed:{" "}
            <strong>{landingMissingLabels.join(", ")}</strong>.{" "}
            {ownerLanding.missing_fields?.includes("room_with_image") ? (
              <>
                Add photos under{" "}
                <Link href="/dashboard/resort/rooms" className="font-semibold underline">
                  Rooms
                </Link>
                .
              </>
            ) : (
              "Fill these in and save to unlock your public page."
            )}
          </span>
        </div>
      )}
      {form && landingReady && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>
            Your public landing page is ready (profile + at least one active room with a photo).{" "}
            {publicLink && (
              <a href={publicLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                View live page <ExternalLink size={12} />
              </a>
            )}
          </span>
        </div>
      )}
      {!emailVerified && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            Your email is not verified yet. Dashboard access for resort owners and marketing partners is blocked until OTP
            verification is completed.
          </span>
        </div>
      )}

      {/* Basic info */}
      <div className="dash-card space-y-4 p-6 lg:p-8">
        <h2 className="inline-flex items-center gap-2 font-dash text-lg text-navy">
          <FileText size={16} className="text-skyBlue" />
          Basic information
        </h2>

        {/* Logo + Background image row */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <ImageIcon size={13} className="text-zinc-500" />
              Resort logo <RequiredBadge />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={laravelPublicUrl(form.logo_url)} alt="Resort logo" className="h-20 w-20 rounded-xl border border-softBorder object-cover" />
              ) : (
                <div className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-rose-200 bg-rose-50 px-1 text-center text-[10px] font-medium leading-tight text-rose-500">
                  <span>No logo</span>
                  <span className="mt-1 text-[9px] font-normal text-rose-400">Preferred 512×512 px</span>
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-softBorder bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                <Upload size={14} />
                {uploadingLogo ? "Uploading..." : "Upload logo"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingLogo} onChange={onLogoUpload} />
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <ImageIcon size={13} className="text-zinc-500" />
              Background image <RequiredBadge />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {form.background_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={laravelPublicUrl(form.background_image_url)} alt="Background" className="h-20 w-36 rounded-xl border border-softBorder object-cover" />
              ) : (
                <div className="flex h-20 w-36 flex-col items-center justify-center rounded-xl border-2 border-dashed border-rose-200 bg-rose-50 px-1.5 text-center text-[10px] font-medium leading-tight text-rose-500">
                  <span>No image</span>
                  <span className="mt-1 text-[9px] font-normal text-rose-400">Preferred 1920×1080 px</span>
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-softBorder bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                <Upload size={14} />
                {uploadingBg ? "Uploading..." : "Upload image"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingBg} onChange={onBgUpload} />
              </label>
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">Used as the full-width background on your landing page.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="resort-name" className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <Building2 size={13} className="text-zinc-500" />
              Resort name <RequiredBadge />
            </label>
            <input
              id="resort-name"
              className="dash-input"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Resort name"
              required
            />
          </div>
          <div>
            <label htmlFor="resort-contact" className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <Phone size={13} className="text-zinc-500" />
              Contact number <RequiredBadge />
            </label>
            <input
              id="resort-contact"
              className="dash-input"
              value={form.contact_number}
              onChange={(e) => onChange("contact_number", e.target.value)}
              placeholder="0917-874-4889"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="resort-address" className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <MapPin size={13} className="text-zinc-500" />
              Address <RequiredBadge />
              <span className="ml-1.5 font-normal text-zinc-400">(used to generate Google Maps on your landing page)</span>
            </label>
            <input
              id="resort-address"
              className="dash-input"
              value={form.address}
              onChange={(e) => onChange("address", e.target.value)}
              placeholder="Full address e.g. 123 Beach Rd, Palawan, Philippines"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="resort-description" className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <FileText size={13} className="text-zinc-500" />
              Description
            </label>
            <textarea
              id="resort-description"
              className="dash-input h-24 resize-none"
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Describe your resort (shown in About section on landing page)"
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700 md:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-softBorder bg-softCard text-skyBlue focus:ring-skyBlue/40"
              checked={form.is_publicly_listed}
              onChange={(e) => onChange("is_publicly_listed", e.target.checked)}
            />
            <Waves size={14} className="text-zinc-500" />
            Publicly listed on platform
          </label>
        </div>
      </div>

      {/* Owner / representative */}
      <div className="dash-card space-y-4 p-6 lg:p-8">
        <h2 className="inline-flex items-center gap-2 font-dash text-lg text-navy">
          <UserRoundCheck size={16} className="text-skyBlue" />
          Owner &amp; representative
        </h2>
        <p className="text-xs text-zinc-500">These details appear in the footer of your public landing page.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <User size={13} className="text-zinc-500" />
              Owner name
            </label>
            <input
              className="dash-input"
              value={form.owner_name}
              onChange={(e) => onChange("owner_name", e.target.value)}
              placeholder="Owner name"
            />
          </div>
          <div>
            <label className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <Phone size={13} className="text-zinc-500" />
              Owner contact number
            </label>
            <input
              className="dash-input"
              value={form.owner_contact_number}
              onChange={(e) => onChange("owner_contact_number", e.target.value)}
              placeholder="09xx xxx xxxx"
            />
          </div>
          <div>
            <label className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <User size={13} className="text-zinc-500" />
              Representative name
            </label>
            <input
              className="dash-input"
              value={form.representative_name}
              onChange={(e) => onChange("representative_name", e.target.value)}
              placeholder="Representative name"
            />
          </div>
          <div>
            <label className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <Mail size={13} className="text-zinc-500" />
              Contact email
              {emailVerified ? (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  <CheckCircle2 size={10} />
                  Verified
                </span>
              ) : (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                  <XCircle size={10} />
                  Unverified
                </span>
              )}
            </label>
            <input
              type="email"
              className="dash-input"
              value={form.representative_email}
              onChange={(e) => onChange("representative_email", e.target.value)}
              placeholder="contact@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <Phone size={13} className="text-zinc-500" />
              Representative contact number
            </label>
            <input
              className="dash-input"
              value={form.representative_contact_number}
              onChange={(e) => onChange("representative_contact_number", e.target.value)}
              placeholder="09xx xxx xxxx"
            />
          </div>
        </div>
      </div>

      {/* Resort public link */}
      <div className="dash-card space-y-4 p-6 lg:p-8">
        <h2 className="inline-flex items-center gap-2 font-dash text-lg text-navy">
          <LinkIcon size={16} className="text-skyBlue" />
          Resort public link
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="dash-input min-w-[280px] flex-1"
            value={publicLink}
            readOnly
            placeholder="Subdomain link will appear here"
          />
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-2 rounded-xl border border-softBorder bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Copy size={14} />
            Copy link
          </button>
        </div>
        <p className="text-xs leading-snug text-zinc-500">
          The web address is built from your <strong className="font-semibold text-zinc-600">Resort name</strong> (for example, TEO →{" "}
          <span className="font-mono text-[11px] text-navy">/resort/teo</span>). Click <strong className="font-semibold text-zinc-600">Save profile</strong> once to
          refresh the link (any field can change — we sync from the saved name). If that short name is already taken, a short random suffix is added automatically.
        </p>
      </div>

      {/* Cancellation policy */}
      <div className="dash-card space-y-4 p-6 lg:p-8">
        <h2 className="inline-flex items-center gap-2 font-dash text-lg text-navy">
          <ShieldCheck size={16} className="text-skyBlue" />
          Cancellation policy
        </h2>
        <div>
          <label htmlFor="cancellation-policy" className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
            <FileText size={13} className="text-zinc-500" />
            Policy description
          </label>
          <textarea
            id="cancellation-policy"
            className="dash-input h-24 resize-none"
            value={form.cancellation_policy}
            onChange={(e) => onChange("cancellation_policy", e.target.value)}
            placeholder="e.g. Free cancellation up to 48 hours before check-in. No refund for late cancellations."
          />
        </div>
      </div>

      {/* Amenities */}
      <div className="dash-card space-y-4 p-6 lg:p-8">
        <h2 className="inline-flex items-center gap-2 font-dash text-lg text-navy">
          <Waves size={16} className="text-skyBlue" />
          Amenities
        </h2>
        <div>
          <label htmlFor="resort-amenities" className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
            <Waves size={13} className="text-zinc-500" />
            Amenities (comma-separated)
          </label>
          <input
            id="resort-amenities"
            className="dash-input"
            value={form.amenities}
            onChange={(e) => onChange("amenities", e.target.value)}
            placeholder="Pool, Spa, Free Wi-Fi, Gym, Restaurant"
          />
          <p className="mt-1.5 text-xs text-zinc-500">Separate each amenity with a comma.</p>
        </div>
        {form.amenities && (
          <div className="flex flex-wrap gap-2">
            {form.amenities.split(",").map((a) => a.trim()).filter(Boolean).map((amenity) => (
              <span key={amenity} className="inline-flex items-center rounded-full border border-softBorder bg-softGray px-2.5 py-0.5 text-xs font-medium text-navy shadow-sm">
                {amenity}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="dash-btn-primary disabled:opacity-50">
          {saving ? "Saving…" : "Save profile"}
        </button>
        {publicLink && landingReady ? (
          <a
            href={publicLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-softBorder bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <ExternalLink size={14} />
            View landing page
          </a>
        ) : publicLink && !landingReady && ownerLanding ? (
          <span className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-500">
            <ExternalLink size={14} className="opacity-60" />
            Public page locked until checklist above is complete
          </span>
        ) : null}
      </div>
    </form>
    <ChangePasswordCard
      idPrefix="resort-profile"
      description={
        <>
          Update the password for your resort owner login. Use at least 8 characters with uppercase, lowercase, and a number.
          Other sessions will be signed out.
        </>
      }
    />
    </div>
  );
}
