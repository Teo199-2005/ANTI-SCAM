import type { PublicResortMap } from "@/lib/api/public";

export type { PublicResortMap };

/** Client fallback when catalog detail has not loaded map from API yet. */
export function publicResortMapFromAddress(address: string | null | undefined): PublicResortMap | null {
  const line = address?.trim();
  if (!line) return null;
  const encoded = encodeURIComponent(line);
  return {
    address: line,
    embedUrl: `https://maps.google.com/maps?q=${encoded}&output=embed&z=15`,
    searchUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  };
}

export function resolvePublicResortMap(
  map: PublicResortMap | null | undefined,
  address: string | null | undefined,
): PublicResortMap | null {
  if (map?.embedUrl?.trim()) {
    return {
      address: map.address ?? address ?? null,
      embedUrl: map.embedUrl,
      searchUrl: map.searchUrl ?? null,
    };
  }
  return publicResortMapFromAddress(address);
}
