/** Public booking page: dedicated `/resort/{slug}` or catalog fallback `/resorts/{id}`. */
export function catalogResortPublicHref(resort: { id: number; slug?: string | null }): string {
  const slug = resort.slug?.trim();
  return slug ? `/resort/${encodeURIComponent(slug)}` : `/resorts/${resort.id}`;
}
