/**
 * Normalize resort-level amenity labels from the public API.
 * Handles arrays of strings and comma-separated entries inside a single string.
 */
export function normalizeResortAmenities(raw: string[] | undefined | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw ?? []) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const parts = trimmed.includes(",")
      ? trimmed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [trimmed];
    for (const t of parts) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}
