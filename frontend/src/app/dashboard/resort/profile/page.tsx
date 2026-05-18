"use client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";

import { PhilippineLocationPicker, type PhilippineLocationValue } from "@/components/locations/PhilippineLocationPicker";
import { BrandWordmark } from "@/components/branding/BrandWordmark";
import ChangePasswordCard from "@/components/dashboard/ChangePasswordCard";
import { LegalLinkButton } from "@/components/legal/LegalLinkButton";
import { useToast } from "@/components/shared/ToastProvider";
import { listResorts, getResort, ownerOnboardResort, updateResort, uploadOwnerResortLogo } from "@/lib/api/resort";
import {
  getOwnerLandingPage,
  LANDING_MISSING_FIELD_LABELS,
  updateOwnerLandingVideo,
  uploadBgImage,
  type OwnerLandingPageResponse,
} from "@/lib/api/landingPage";
import { isBusinessProPlan } from "@/lib/subscriptionPlans";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { resortPublicLandingPageUrl } from "@/lib/urls/resortPublicLandingUrl";
import {
  ACCEPT_RASTER_IMAGES,
  RESORT_BACKGROUND_MAX_BYTES,
  RESORT_LOGO_MAX_BYTES,
} from "@/lib/uploads/resortProfileUploads";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  UserRoundCheck,
  Waves,
  XCircle,
} from "lucide-react";
import {
  sanitizeAmenityListTyping,
  sanitizeBusinessOrResortName,
  sanitizeEmailTyping,
  sanitizeLongText,
  sanitizePersonName,
  sanitizePhoneInput,
} from "@/lib/inputRestrictions";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buildPhilippinesGeocodeQuery } from "@/lib/locations/buildPhilippinesGeocodeQuery";

const ResortMapPinPicker = dynamic(() => import("@/components/resort-profile/ResortMapPinPicker"), { ssr: false });

type FormState = {
  id: number;
  name: string;
  description: string;
  address_province_psgc: string | null;
  address_city_municipality_psgc: string | null;
  /** Legacy PSGC barangay code (read-only for hint); new saves use address_barangay_name */
  address_barangay_psgc: string | null;
  address_barangay_name: string | null;
  address_street_line: string;
  map_latitude: number | null;
  map_longitude: number | null;
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
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
};

function RequiredBadge() {
  return <span className="ml-1 text-rose-500">*</span>;
}

function UploadErrorNotice({ detail }: { detail: string }) {
  return (
    <details className="group mt-2 rounded-xl border border-rose-200 bg-rose-50/95 text-rose-900">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />
        <span>Upload didn&apos;t complete — expand for full message</span>
      </summary>
      <p className="border-t border-rose-100/90 px-3 py-2.5 text-xs leading-relaxed text-rose-900/95 whitespace-pre-wrap">{detail}</p>
    </details>
  );
}

export default function ResortProfilePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { pushToast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [logoUploadDetail, setLogoUploadDetail] = useState<string | null>(null);
  const [bgUploadDetail, setBgUploadDetail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [needsWorkspaceSetup, setNeedsWorkspaceSetup] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  /** Same readiness rules as the public `/resort/{slug}` page (includes active room + photo). */
  const [ownerLanding, setOwnerLanding] = useState<OwnerLandingPageResponse | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoSaving, setVideoSaving] = useState(false);

  const mapRegionGeocodeQuery = useMemo(() => {
    if (!form) return null;
    return buildPhilippinesGeocodeQuery(form.address_province_psgc, form.address_city_municipality_psgc);
  }, [form?.address_province_psgc, form?.address_city_municipality_psgc]);

  const publicLink =
    subdomain && typeof window !== "undefined" ? resortPublicLandingPageUrl(subdomain) : "";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setNeedsWorkspaceSetup(false);
      try {
        const resorts = await listResorts({ perPage: 10 });
        const first = resorts.data[0];
        if (!first) {
          if (user?.role === "resort_owner") {
            setNeedsWorkspaceSetup(true);
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
        setVideoEnabled(Boolean((raw.admin_landing_embed_enabled as boolean) ?? false));
        setVideoUrl((raw.admin_landing_youtube_url as string) ?? "");

        setForm({
          id: first.id,
          name: first.name,
          description: first.description ?? "",
          address_province_psgc: first.address_province_psgc ?? null,
          address_city_municipality_psgc: first.address_city_municipality_psgc ?? null,
          address_barangay_psgc: first.address_barangay_psgc ?? null,
          address_barangay_name: first.address_barangay_name ?? null,
          address_street_line: first.address_street_line ?? "",
          map_latitude: first.map_latitude != null ? Number(first.map_latitude) : null,
          map_longitude: first.map_longitude != null ? Number(first.map_longitude) : null,
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
          facebook_url: (raw.facebook_url as string) ?? "",
          instagram_url: (raw.instagram_url as string) ?? "",
          tiktok_url: (raw.tiktok_url as string) ?? "",
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

  const finishWorkspaceSetup = async () => {
    if (!user?.name) return;
    const ownerLabel = (user.name ?? "Resort Owner").trim();
    setSetupBusy(true);
    try {
      await ownerOnboardResort({
        tenant_name: ownerLabel,
        resort_name: `${ownerLabel}'s Resort`,
        is_publicly_listed: false,
        accept_terms: true,
      });
      await refreshUser();
      setNeedsWorkspaceSetup(false);
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
        address_province_psgc: first.address_province_psgc ?? null,
        address_city_municipality_psgc: first.address_city_municipality_psgc ?? null,
        address_barangay_psgc: first.address_barangay_psgc ?? null,
        address_barangay_name: first.address_barangay_name ?? null,
        address_street_line: first.address_street_line ?? "",
        map_latitude: first.map_latitude != null ? Number(first.map_latitude) : null,
        map_longitude: first.map_longitude != null ? Number(first.map_longitude) : null,
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
        facebook_url: (raw.facebook_url as string) ?? "",
        instagram_url: (raw.instagram_url as string) ?? "",
        tiktok_url: (raw.tiktok_url as string) ?? "",
      });
      setError(null);
      pushToast({
        title: "Workspace ready",
        description: "Your resort workspace is ready. You can complete your profile below.",
        tone: "success",
      });
    } catch (err) {
      pushToast({
        title: "Setup failed",
        description: parseApiErrorMessage(err, "Could not create your resort workspace."),
        tone: "error",
      });
    } finally {
      setSetupBusy(false);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dash-card p-8 text-center text-zinc-600">Loading resort profile…</div>;
  }

  if (needsWorkspaceSetup && user?.role === "resort_owner") {
    return (
      <div className="dash-card max-w-xl p-8">
        <h1 className="dash-page-title inline-flex items-center gap-2">
          <Building2 size={24} className="text-skyBlue" />
          Finish setup
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your account does not have a resort workspace yet. This one-time step creates your tenant and default resort
          so you can use the dashboard, rooms, and subscription checkout.
        </p>
        <button
          type="button"
          disabled={setupBusy}
          className="dash-btn-primary mt-6 px-6 py-2.5 disabled:opacity-50"
          onClick={() => void finishWorkspaceSetup()}
        >
          {setupBusy ? "Setting up…" : "Create resort workspace"}
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
        case "address_street_line":
          next = sanitizeLongText(value, 255) as FormState[K];
          break;
        case "description":
        case "cancellation_policy":
          next = sanitizeLongText(value) as FormState[K];
          break;
        case "amenities":
          next = sanitizeAmenityListTyping(value) as FormState[K];
          break;
        case "facebook_url":
        case "instagram_url":
        case "tiktok_url":
          next = value.trim().slice(0, 2048) as FormState[K];
          break;
        default:
          break;
      }
    }
    setForm((prev) => (prev ? { ...prev, [key]: next } : prev));
  };

  const landingReady = Boolean(ownerLanding?.is_ready);
  const emailVerified = Boolean(user?.email_verified_at);

  const refreshOwnerLanding = async () => {
    const resortId = form?.id;
    try {
      const landing = await getOwnerLandingPage();
      setOwnerLanding(landing);
      setSubdomain(landing.subdomain ?? null);
      if (resortId != null) {
        try {
          const resort = await getResort(resortId);
          setForm((prev) => {
            if (!prev || prev.id !== resort.id) return prev;
            return {
              ...prev,
              name: resort.name,
              logo_url: resort.logo_url ?? "",
              background_image_url: resort.background_image_url ?? "",
              address_province_psgc: resort.address_province_psgc ?? null,
              address_city_municipality_psgc: resort.address_city_municipality_psgc ?? null,
              address_barangay_psgc: resort.address_barangay_psgc ?? null,
              address_barangay_name: resort.address_barangay_name ?? null,
              address_street_line: resort.address_street_line ?? "",
              map_latitude: resort.map_latitude != null ? Number(resort.map_latitude) : null,
              map_longitude: resort.map_longitude != null ? Number(resort.map_longitude) : null,
              facebook_url: resort.facebook_url ?? "",
              instagram_url: resort.instagram_url ?? "",
              tiktok_url: resort.tiktok_url ?? "",
            };
          });
        } catch {
          /* keep existing form if resort fetch fails */
        }
      }
    } catch {
      setOwnerLanding(null);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateResort(form.id, {
        description: form.description || null,
        address_province_psgc: form.address_province_psgc,
        address_city_municipality_psgc: form.address_city_municipality_psgc,
        address_barangay_name: form.address_barangay_name?.trim() || null,
        address_barangay_psgc: null,
        address_street_line: form.address_street_line?.trim() || null,
        map_latitude: form.map_latitude,
        map_longitude: form.map_longitude,
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
        facebook_url: form.facebook_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        tiktok_url: form.tiktok_url.trim() || null,
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
        title: "Could not save profile",
        description: parseApiErrorMessage(err, "Check the form and try again."),
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
    setLogoUploadDetail(null);
    if (file.size > RESORT_LOGO_MAX_BYTES) {
      pushToast({
        title: "Logo file too large",
        description: `Use an image up to ${Math.floor(RESORT_LOGO_MAX_BYTES / (1024 * 1024))} MB (try a smaller export or JPEG/WebP).`,
        tone: "error",
      });
      return;
    }
    setUploadingLogo(true);
    try {
      const logoUrl = await uploadOwnerResortLogo(file);
      setForm({ ...form, logo_url: logoUrl });
      await refreshOwnerLanding();
      pushToast({
        title: "Logo uploaded",
        description: "Opening the media editor to crop and position your logo.",
        tone: "success",
      });
      router.push("/dashboard/resort/profile/media?tab=logo");
    } catch (err) {
      const detail = parseApiErrorMessage(err, "Please try another image.");
      setLogoUploadDetail(detail);
      pushToast({
        title: "Logo upload failed",
        description: detail,
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
    setBgUploadDetail(null);
    if (file.size > RESORT_BACKGROUND_MAX_BYTES) {
      pushToast({
        title: "Background image too large",
        description: `Use a file up to ${Math.floor(RESORT_BACKGROUND_MAX_BYTES / (1024 * 1024))} MB. If it still fails after that, ask your host to allow larger uploads.`,
        tone: "error",
      });
      return;
    }
    setUploadingBg(true);
    try {
      const url = await uploadBgImage(file);
      setForm({ ...form, background_image_url: url });
      await refreshOwnerLanding();
      pushToast({
        title: "Background image uploaded",
        description: "Opening the media editor to frame your cover photo.",
        tone: "success",
      });
      router.push("/dashboard/resort/profile/media?tab=cover");
    } catch (err) {
      const detail = parseApiErrorMessage(err, "Please try another image.");
      setBgUploadDetail(detail);
      pushToast({
        title: "Upload failed",
        description: detail,
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
          <div>
            <p>
              Your public landing page is not live yet. Complete the items below, then <strong>Save profile</strong>{" "}
              (and add room photos under <Link href="/dashboard/resort/rooms">Rooms</Link> if listed).
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 font-medium">
              {(ownerLanding.missing_fields ?? []).map((k) => (
                <li key={k}>{LANDING_MISSING_FIELD_LABELS[k] ?? k}</li>
              ))}
            </ul>
          </div>
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
                <img
                  src={laravelPublicUrl(form.logo_url)}
                  alt="Resort logo"
                  className="h-28 w-28 rounded-xl border border-softBorder bg-white object-contain sm:h-32 sm:w-32"
                />
              ) : (
                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-rose-200 bg-rose-50 px-1.5 text-center text-[10px] font-medium leading-tight text-rose-500 sm:h-32 sm:w-32">
                  <span>No logo</span>
                  <span className="mt-1 text-[9px] font-normal text-rose-400">Preferred 512×512 px</span>
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-softBorder bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                <Upload size={14} />
                {uploadingLogo ? "Uploading..." : "Upload logo"}
                <input type="file" accept={ACCEPT_RASTER_IMAGES} className="hidden" disabled={uploadingLogo} onChange={onLogoUpload} />
              </label>
            </div>
            {logoUploadDetail ? <UploadErrorNotice detail={logoUploadDetail} /> : null}
          </div>

          <div>
            <label className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <ImageIcon size={13} className="text-zinc-500" />
              Background image <RequiredBadge />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {form.background_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={laravelPublicUrl(form.background_image_url)}
                  alt="Background"
                  className="h-28 w-52 rounded-xl border border-softBorder bg-zinc-100 object-contain sm:h-32 sm:w-60"
                />
              ) : (
                <div className="flex h-28 w-52 flex-col items-center justify-center rounded-xl border-2 border-dashed border-rose-200 bg-rose-50 px-2 text-center text-[10px] font-medium leading-tight text-rose-500 sm:h-32 sm:w-60">
                  <span>No image</span>
                  <span className="mt-1 text-[9px] font-normal text-rose-400">Any aspect ratio</span>
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-softBorder bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                <Upload size={14} />
                {uploadingBg ? "Uploading..." : "Upload image"}
                <input type="file" accept={ACCEPT_RASTER_IMAGES} className="hidden" disabled={uploadingBg} onChange={onBgUpload} />
              </label>
            </div>
            {bgUploadDetail ? <UploadErrorNotice detail={bgUploadDetail} /> : null}
          </div>
        </div>

        <div className="rounded-xl border border-softBorder bg-softGray/15 p-4">
          <p className="font-dash text-xs font-semibold text-navy">Landing intro video (Business Pro)</p>
          <p className="mt-1 font-dash text-xs text-zinc-500">
            Optional YouTube embed on your public resort page. Requires Business Pro.
          </p>
          {isBusinessProPlan(ownerLanding?.subscription_plan, ownerLanding?.subscription_status) ? (
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={videoEnabled}
                  onChange={(e) => setVideoEnabled(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                Show intro video on public landing page
              </label>
              <input
                type="url"
                className="dash-input"
                placeholder="https://www.youtube.com/watch?v=…"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={!videoEnabled}
              />
              <button
                type="button"
                disabled={videoSaving}
                onClick={async () => {
                  setVideoSaving(true);
                  try {
                    await updateOwnerLandingVideo({
                      admin_landing_embed_enabled: videoEnabled,
                      admin_landing_youtube_url: videoUrl.trim() || null,
                    });
                    pushToast({ title: "Video saved", description: "Landing intro video updated.", tone: "success" });
                  } catch (err) {
                    pushToast({
                      title: "Could not save video",
                      description: parseApiErrorMessage(err, "Check your YouTube URL and try again."),
                      tone: "error",
                    });
                  } finally {
                    setVideoSaving(false);
                  }
                }}
                className="dash-btn-primary"
              >
                {videoSaving ? "Saving…" : "Save video settings"}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">
              Upgrade to Business Pro from the dashboard top bar to add a YouTube intro on your booking site.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-softBorder bg-softGray/15 p-4">
          <p className="font-dash text-xs font-semibold text-navy">Social links (optional)</p>
          <p className="mt-1 font-dash text-xs text-zinc-500">
            Paste full profile URLs. Icons appear next to the booking trust line on your public landing page when saved.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <label htmlFor="social-facebook" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Facebook
              </label>
              <input
                id="social-facebook"
                type="url"
                inputMode="url"
                className="dash-input"
                value={form.facebook_url}
                onChange={(e) => onChange("facebook_url", e.target.value)}
                placeholder="https://facebook.com/…"
              />
            </div>
            <div>
              <label htmlFor="social-instagram" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Instagram
              </label>
              <input
                id="social-instagram"
                type="url"
                inputMode="url"
                className="dash-input"
                value={form.instagram_url}
                onChange={(e) => onChange("instagram_url", e.target.value)}
                placeholder="https://instagram.com/…"
              />
            </div>
            <div>
              <label htmlFor="social-tiktok" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                TikTok
              </label>
              <input
                id="social-tiktok"
                type="url"
                inputMode="url"
                className="dash-input"
                value={form.tiktok_url}
                onChange={(e) => onChange("tiktok_url", e.target.value)}
                placeholder="https://www.tiktok.com/@…"
              />
            </div>
          </div>
        </div>

        {(form.logo_url || form.background_image_url) && (
          <div className="flex flex-col gap-3 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50/95 to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="font-dash text-sm font-semibold text-navy">Profile media editor</p>
                <p className="mt-0.5 max-w-xl font-dash text-xs leading-relaxed text-zinc-600 sm:text-sm">
                  Crop, zoom, and align your logo and cover photo. Saved images update your resort profile for guests.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/resort/profile/media"
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primaryBlue px-4 py-2.5 font-dash text-sm font-semibold text-white shadow-dash-primary transition hover:bg-primaryBlueDark sm:self-center"
            >
              Open editor
            </Link>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="resort-name" className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <Building2 size={13} className="text-zinc-500" />
              Resort name <RequiredBadge />
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                <Lock size={10} className="shrink-0" aria-hidden />
                Locked
              </span>
            </label>
            <input
              id="resort-name"
              className="dash-input cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-700"
              value={form.name}
              readOnly
              aria-readonly="true"
              title="Resort name is set at registration and cannot be changed."
            />
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">
              Set when you registered. One resort, one account, and one email — the name is kept for verification and
              cannot be edited here.
            </p>
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
            <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <MapPin size={13} className="text-zinc-500" />
              Philippine location <RequiredBadge />
              <span className="ml-1.5 font-normal text-zinc-400">(province, city or municipality, barangay — used for maps and search; data from PSA PSGC)</span>
            </div>
            <PhilippineLocationPicker
              idPrefix="resort-profile"
              disabled={saving}
              legacyBarangayCodeHint={Boolean(form.address_barangay_psgc && !form.address_barangay_name?.trim())}
              value={{
                provinceCode: form.address_province_psgc,
                cityCode: form.address_city_municipality_psgc,
                barangayName: form.address_barangay_name,
              }}
              onChange={(next: PhilippineLocationValue) => {
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        address_province_psgc: next.provinceCode,
                        address_city_municipality_psgc: next.cityCode,
                        address_barangay_name: next.barangayName,
                      }
                    : prev,
                );
              }}
              barangayRowEnd={
                <>
                  <label htmlFor="resort-street" className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                    <MapPin size={13} className="text-zinc-500" />
                    Street / building line
                  </label>
                  <input
                    id="resort-street"
                    className="dash-input"
                    value={form.address_street_line}
                    onChange={(e) => onChange("address_street_line", e.target.value)}
                    placeholder="House number, street, subdivision (optional)"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Shown before your PSA location on maps and your landing page address line.
                  </p>
                </>
              }
            />
          </div>
          <div className="md:col-span-2 space-y-2 rounded-xl border border-softBorder bg-softCard/40 p-4">
            <p className="text-xs font-semibold text-zinc-600">Map pin</p>
            <ResortMapPinPicker
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
              latitude={form.map_latitude}
              longitude={form.map_longitude}
              disabled={saving}
              regionGeocodeQuery={mapRegionGeocodeQuery}
              onPinChange={(lat, lng) => {
                setForm((prev) => (prev ? { ...prev, map_latitude: lat, map_longitude: lng } : prev));
              }}
            />
            <button
              type="button"
              className="dash-btn-sm border border-zinc-200 bg-white text-zinc-700"
              disabled={saving || (form.map_latitude == null && form.map_longitude == null)}
              onClick={() => setForm((prev) => (prev ? { ...prev, map_latitude: null, map_longitude: null } : prev))}
            >
              Clear map pin
            </button>
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
              placeholder="e.g. Juan Dela Cruz"
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
              placeholder="e.g. Maria Santos"
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
          Your public link is based on your registered resort name (for example, Golden Villa Resort →{" "}
          <span className="font-mono text-[11px] text-navy">/resort/golden-villa-resort</span>). The resort name is
          fixed for verification; contact support if you need a correction.
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
