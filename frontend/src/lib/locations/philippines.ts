/** PSGC-style row returned by Laravel location endpoints */
export type PhilippineLocationRow = {
  code: string;
  name: string;
  province_code?: string;
  city_municipality_code?: string;
};

export type PhilippineLocationParts = {
  barangayName?: string | null;
  cityName?: string | null;
  provinceName?: string | null;
};

/**
 * Format a display line from resolved names (e.g. footer / cards).
 * Omits empty segments and joins with ", ".
 */
export function formatPhilippineLocation(parts: PhilippineLocationParts): string {
  const segs = [parts.barangayName, parts.cityName, parts.provinceName]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return segs.join(", ");
}
