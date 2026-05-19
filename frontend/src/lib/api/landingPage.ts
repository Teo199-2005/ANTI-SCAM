import { apiClient, publicClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import { shrinkRasterForUpload } from "@/lib/uploads/shrinkRasterForUpload";

// ── Owner dashboard types ────────────────────────────────────────────────────

export type LandingMissingField =
  | "resort_name"
  | "location"
  | "contact_number"
  | "logo"
  | "background_image"
  | "room_with_image";

/** Human labels — matches backend `LandingReadinessService` keys */
export const LANDING_MISSING_FIELD_LABELS: Record<LandingMissingField, string> = {
  resort_name: "Resort name",
  location: "Philippine location (province, city, barangay)",
  contact_number: "Contact number",
  logo: "Resort logo",
  background_image: "Background image",
  room_with_image: "At least one active room with a photo",
};

export type LandingComputedHero = {
  heading: string;
  subheading: string | null;
  bgImageUrl: string | null;
  logoUrl: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
};

export type LandingComputedAbout = {
  heading: string;
  body: string | null;
};

export type LandingRoomImage = {
  id: number;
  url: string;
};

export type LandingComputedRoom = {
  id: number;
  name: string;
  capacity: number;
  basePrice: number;
  /** Guest reservation fee (PHP); used for displayed nightly rate. */
  reservationFee?: number;
  amenities: string[];
  rules: string | null;
  images: LandingRoomImage[];
};

export type LandingComputedFooter = {
  ownerName: string | null;
  ownerContact: string | null;
  representativeName: string | null;
  representativeContact: string | null;
  contactEmail: string | null;
  resortContact: string | null;
  address: string | null;
};

export type LandingComputedMap = {
  address: string | null;
  embedUrl: string | null;
  searchUrl: string | null;
};

export type LandingComputedPayload = {
  hero: LandingComputedHero;
  about: LandingComputedAbout;
  rooms: LandingComputedRoom[];
  gallery: string[];
  footer: LandingComputedFooter;
  map: LandingComputedMap;
};

export type OwnerLandingPageResponse = {
  subdomain: string | null;
  resort_id: number;
  subscription_status: string | null | undefined;
  subscription_plan?: string | null;
  subscription_end_at?: string | null;
  subscription_billing_mode?: "manual" | "auto_card" | string | null;
  subscription_renewal_duration_months?: number;
  subscription_recurring_cancelled_at?: string | null;
  subscription_next_due_date?: string | null;
  is_ready: boolean;
  missing_fields: LandingMissingField[];
  computed: LandingComputedPayload | null;
};

// ── Public landing page types ────────────────────────────────────────────────

export type PublicAdminLandingEmbed = {
  enabled: boolean;
  youtubeVideoId: string | null;
};

export type PublicResortLandingPayload = {
  id: number;
  slug: string;
  tenantId: number;
  name: string;
  description: string | null;
  address: string | null;
  contactNumber: string | null;
  logoUrl: string | null;
  isVip: boolean;
  plan?: string;
  badgeLabel?: string;
  isPremiumVerified?: boolean;
  /** Resort-level amenities from the owner profile (display chips on the public landing page). */
  amenities?: string[];
  cancellationPolicy?: string | null;
  hero: LandingComputedHero;
  about: LandingComputedAbout;
  rooms: LandingComputedRoom[];
  gallery: string[];
  footer: LandingComputedFooter;
  map: LandingComputedMap;
  /** Platform-controlled intro video on public resort landing (admin-configured). */
  adminLandingEmbed?: PublicAdminLandingEmbed;
};

// ── API functions ────────────────────────────────────────────────────────────

export async function getOwnerLandingPage(): Promise<OwnerLandingPageResponse> {
  const { data } = await apiClient.get<ApiEnvelope<OwnerLandingPageResponse>>("/resort-owner/landing-page");
  return data.data;
}

export async function updateOwnerLandingVideo(payload: {
  admin_landing_embed_enabled: boolean;
  admin_landing_youtube_url?: string | null;
}): Promise<{ admin_landing_embed_enabled: boolean; admin_landing_youtube_url: string | null }> {
  const { data } = await apiClient.patch<
    ApiEnvelope<{ admin_landing_embed_enabled: boolean; admin_landing_youtube_url: string | null }>
  >("/resort-owner/landing-page/video", payload);
  return data.data;
}

const MULTIPART_UPLOAD_TIMEOUT_MS = 180_000;

export async function uploadBgImage(file: File): Promise<string> {
  const prepared = typeof window !== "undefined" ? await shrinkRasterForUpload(file) : file;
  const form = new FormData();
  form.append("image", prepared);
  const { data } = await apiClient.post<ApiEnvelope<{ url: string }>>(
    "/resort-owner/landing-page/upload-bg-image",
    form,
    {
      timeout: MULTIPART_UPLOAD_TIMEOUT_MS,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    },
  );
  return data.data.url;
}

export async function uploadLandingPageImage(file: File): Promise<string> {
  const urls = await uploadLandingPageImages([file]);
  return urls[0] ?? "";
}

export async function uploadLandingPageImages(files: File[]): Promise<string[]> {
  const prepared =
    typeof window !== "undefined" ? await Promise.all(files.map((f) => shrinkRasterForUpload(f))) : files;
  const form = new FormData();
  prepared.forEach((f) => form.append("images[]", f));
  const { data } = await apiClient.post<ApiEnvelope<{ url?: string; urls?: string[] }>>(
    "/resort-owner/landing-page/upload-image",
    form,
    {
      timeout: MULTIPART_UPLOAD_TIMEOUT_MS,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    },
  );
  const urls = data.data.urls ?? (data.data.url ? [data.data.url] : []);
  return urls.filter(Boolean);
}

/** Server-side or client: fetch public landing payload by tenant subdomain */
export async function getPublicResortBySubdomain(subdomain: string): Promise<
  | { ok: true; data: PublicResortLandingPayload }
  | { ok: false; status: number; message: string; code?: string }
> {
  const res = await publicClient.get<ApiEnvelope<PublicResortLandingPayload>>(
    `/public/resorts/landing/${encodeURIComponent(subdomain)}`,
    { validateStatus: () => true },
  );
  const body = res.data;
  if (res.status === 404) {
    return { ok: false, status: 404, message: body?.message ?? "Resort not found." };
  }
  if (res.status === 403) {
    const code =
      body?.errors && typeof body.errors === "object" && "code" in body.errors
        ? String((body.errors as { code?: string }).code ?? "")
        : undefined;
    return { ok: false, status: 403, message: body?.message ?? "Subscription not active.", code };
  }
  if (res.status === 503) {
    return {
      ok: false,
      status: 503,
      message: body?.message ?? "Landing page not yet set up.",
      code: "landing_incomplete",
    };
  }
  if (!body?.success || !body.data) {
    return { ok: false, status: res.status, message: body?.message ?? "Unable to load resort." };
  }
  const raw = body.data as PublicResortLandingPayload;
  const data: PublicResortLandingPayload = {
    ...raw,
    adminLandingEmbed: raw.adminLandingEmbed ?? { enabled: false, youtubeVideoId: null },
  };
  return { ok: true, data };
}
