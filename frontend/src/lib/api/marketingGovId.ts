import { publicClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

export type MarketingGovIdOption = {
  slug: string;
  label: string;
  placeholder: string;
  format_hint: string;
};

export async function getMarketingGovIdOptions(): Promise<MarketingGovIdOption[]> {
  const { data } = await publicClient.get<ApiEnvelope<MarketingGovIdOption[]>>("/auth/marketing-gov-id-options");
  if (!data.success || !Array.isArray(data.data)) return [];
  return data.data;
}

/** Build absolute URL for Laravel public storage paths like `/storage/...`. */
export function laravelStorageUrl(storagePath: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
  const origin = apiBase.replace(/\/api\/v1\/?$/, "");
  return `${origin.replace(/\/$/, "")}${storagePath.startsWith("/") ? storagePath : `/${storagePath}`}`;
}
