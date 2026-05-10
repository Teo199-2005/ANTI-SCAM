import { getLaravelWebOrigin } from "@/lib/api/baseUrl";
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
  const origin = getLaravelWebOrigin().replace(/\/$/, "");
  return `${origin}${storagePath.startsWith("/") ? storagePath : `/${storagePath}`}`;
}
