import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import { shrinkRasterForUpload } from "@/lib/uploads/shrinkRasterForUpload";

export type SubscriptionInfo = {
  id: number;
  plan: "standard" | "basic" | "premium" | "vip";
  base_price: string;
  included_rooms: number;
  extra_room_fee: string;
  active_room_count: number;
  total_monthly_fee: string;
  billing_cycle_start: string;
  billing_cycle_end: string;
  next_due_date: string;
  grace_until: string | null;
  status: "active" | "pending_payment" | "grace_period" | "suspended" | "cancelled";
};

export type ResortItem = {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  /** Resolved display line (barangay, city, province) or legacy label */
  address: string | null;
  address_display?: string | null;
  address_province_psgc?: string | null;
  address_city_municipality_psgc?: string | null;
  address_barangay_psgc?: string | null;
  address_barangay_name?: string | null;
  /** Street / building line (optional). */
  address_street_line?: string | null;
  map_latitude?: number | null;
  map_longitude?: number | null;
  address_label?: string | null;
  contact_number: string | null;
  logo_url?: string | null;
  background_image_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  representative_name?: string | null;
  representative_contact_number?: string | null;
  cancellation_policy?: string | null;
  amenities?: string[] | null;
  is_publicly_listed: boolean;
  is_vip?: boolean;
  rooms_count?: number;
  /** Tenant subdomain for `/resort/{slug}` when the tenant relation is loaded. */
  subdomain?: string | null;
  /** Admin-only: optional intro video on the owner’s public landing page. */
  admin_landing_embed_enabled?: boolean;
  admin_landing_youtube_url?: string | null;
  subscription?: SubscriptionInfo;
  created_at: string;
  updated_at: string;
};

export type PaginatedResult<T> = {
  data: T[];
  meta?: Record<string, unknown>;
};

export async function listResorts(params?: {
  search?: string;
  perPage?: number;
  page?: number;
  sort_by?: string;
  sort_dir?: string;
  province_psgc?: string | null;
  city_municipality_psgc?: string | null;
}) {
  const { data } = await apiClient.get<
    ApiEnvelope<ResortItem[] | { data: ResortItem[]; meta?: Record<string, unknown> }>
  >("/resorts", { params });

  const payload = data.data;
  if (Array.isArray(payload)) {
    return { data: payload } as PaginatedResult<ResortItem>;
  }

  return { data: payload?.data ?? [], meta: payload?.meta } as PaginatedResult<ResortItem>;
}

export async function getResort(id: number | string) {
  const { data } = await apiClient.get<ApiEnvelope<ResortItem>>(`/resorts/${id}`);
  return data.data;
}

export async function createResort(payload: Partial<ResortItem> & { name: string }) {
  const { data } = await apiClient.post<ApiEnvelope<ResortItem>>("/resorts", payload);
  return data.data;
}

export async function updateResort(id: number | string, payload: Partial<ResortItem>) {
  const { data } = await apiClient.put<ApiEnvelope<ResortItem>>(`/resorts/${id}`, payload);
  return data.data;
}

export async function deleteResort(id: number | string) {
  await apiClient.delete(`/resorts/${id}`);
}

export async function ownerOnboardResort(payload: {
  tenant_name: string;
  resort_name: string;
  /** Omit to let the API derive a unique subdomain from the tenant name. */
  subdomain?: string;
  address_province_psgc?: string | null;
  address_city_municipality_psgc?: string | null;
  address_barangay_psgc?: string | null;
  address_barangay_name?: string | null;
  address_label?: string | null;
  contact_number?: string;
  logo_url?: string;
  description?: string;
  plan?: "basic";
  is_publicly_listed?: boolean;
  /** Required: explicit acceptance of platform Terms & Conditions before first resort workspace is created. */
  accept_terms: boolean;
}) {
  const { data } = await apiClient.post<ApiEnvelope<{ resort: ResortItem }>>("/resort-owner/onboard", payload);
  return data.data;
}

export async function uploadOwnerResortLogo(file: File): Promise<string> {
  const prepared = typeof window !== "undefined" ? await shrinkRasterForUpload(file) : file;
  const form = new FormData();
  form.append("logo", prepared);
  const { data } = await apiClient.post<ApiEnvelope<{ logo_url: string }>>(
    "/resort-owner/onboard/upload-logo",
    form,
    {
      timeout: 120_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    },
  );
  return data.data.logo_url;
}
