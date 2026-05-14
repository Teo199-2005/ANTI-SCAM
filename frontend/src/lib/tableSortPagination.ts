export type SortDir = "asc" | "desc";

/** Laravel paginator meta on API resources */
export type LaravelTableMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export function nextSort(
  clickedKey: string,
  activeKey: string | null,
  currentDir: SortDir,
  /** Direction used when switching to this column */
  firstDirForKey: SortDir,
): { key: string; dir: SortDir } {
  if (activeKey === clickedKey) {
    return { key: clickedKey, dir: currentDir === "asc" ? "desc" : "asc" };
  }
  return { key: clickedKey, dir: firstDirForKey };
}

export function extractLaravelMeta(payload: unknown): LaravelTableMeta | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  /** API Resources wrap meta; raw LengthAwarePaginator JSON is flat on the payload */
  const meta = p.meta;
  const m =
    meta && typeof meta === "object"
      ? (meta as Record<string, unknown>)
      : (p.current_page !== undefined || p.last_page !== undefined ? p : null);
  if (!m) return null;
  const current_page = typeof m.current_page === "number" ? m.current_page : 1;
  const last_page = typeof m.last_page === "number" ? m.last_page : 1;
  const per_page = typeof m.per_page === "number" ? m.per_page : 10;
  const total = typeof m.total === "number" ? m.total : 0;
  return { current_page, last_page, per_page, total };
}

/** Slice a full in-memory list into one page (client-side pagination). */
export function paginateLocal<T>(rows: T[], page: number, perPage: number): { slice: T[]; meta: LaravelTableMeta } {
  const total = rows.length;
  const last_page = Math.max(1, Math.ceil(total / perPage) || 1);
  const current_page = Math.min(Math.max(1, page), last_page);
  const start = (current_page - 1) * perPage;
  const slice = rows.slice(start, start + perPage);
  return {
    slice,
    meta: { current_page, last_page, per_page: perPage, total },
  };
}

export function compareNullable(a: unknown, b: unknown, dir: SortDir): number {
  const mul = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1 * mul;
  if (b == null) return -1 * mul;
  if (typeof a === "number" && typeof b === "number" && !Number.isNaN(a) && !Number.isNaN(b)) {
    return (a - b) * mul;
  }
  const sa = String(a);
  const sb = String(b);
  return sa.localeCompare(sb, undefined, { sensitivity: "base", numeric: true }) * mul;
}
