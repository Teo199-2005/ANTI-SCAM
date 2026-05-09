import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

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
  address: string | null;
  contact_number: string | null;
  logo_url?: string | null;
  background_image_url?: string | null;
  representative_name?: string | null;
  representative_contact_number?: string | null;
  is_publicly_listed: boolean;
  is_vip?: boolean;
  rooms_count?: number;
  subscription?: SubscriptionInfo;
  created_at: string;
  updated_at: string;
};

export type PaginatedResult<T> = {
  data: T[];
  meta?: Record<string, unknown>;
};

export async function listResorts(params?: { search?: string; perPage?: number; page?: number }) {
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
  subdomain: string;
  address?: string;
  contact_number?: string;
  logo_url?: string;
  description?: string;
  plan?: "basic";
  is_publicly_listed?: boolean;
}) {
  const { data } = await apiClient.post<ApiEnvelope<{ resort: ResortItem }>>("/resort-owner/onboard", payload);
  return data.data;
}

export async function uploadOwnerResortLogo(file: File): Promise<string> {
  const form = new FormData();
  form.append("logo", file);
  const { data } = await apiClient.post<ApiEnvelope<{ logo_url: string }>>(
    "/resort-owner/onboard/upload-logo",
    form,
  );
  return data.data.logo_url;
}
