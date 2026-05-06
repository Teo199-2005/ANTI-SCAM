const STORAGE_KEY = "rs_client_favorite_resort_ids";

export function getFavoriteResortIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

export function isFavoriteResortId(id: number): boolean {
  return getFavoriteResortIds().includes(id);
}

export function toggleFavoriteResortId(id: number): boolean {
  const ids = getFavoriteResortIds();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next.includes(id);
}

export function removeFavoriteResortId(id: number): void {
  const next = getFavoriteResortIds().filter((x) => x !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
