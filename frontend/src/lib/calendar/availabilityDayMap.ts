export type AvailabilityStatus = "available" | "blocked" | "maintenance";

export type AvailabilityRange = {
  id?: number;
  start_date: string;
  end_date: string;
  status: AvailabilityStatus;
  reason?: string | null;
};

export function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function expandRange(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = parseYmd(start);
  const endDate = parseYmd(end);
  while (cursor <= endDate) {
    days.push(toLocalYmd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Day-level map; only blocked/maintenance are stored (available = absent). */
export function rangesToBlockedMap(ranges: AvailabilityRange[]): Map<string, AvailabilityStatus> {
  const map = new Map<string, AvailabilityStatus>();
  for (const r of ranges) {
    if (r.status === "available") continue;
    for (const day of expandRange(r.start_date, r.end_date)) {
      map.set(day, r.status);
    }
  }
  return map;
}

export function applyStatusToDays(
  map: Map<string, AvailabilityStatus>,
  days: string[],
  status: AvailabilityStatus,
): void {
  for (const ymd of days) {
    if (status === "available") {
      map.delete(ymd);
    } else {
      map.set(ymd, status);
    }
  }
}

export function blockedMapToRanges(
  map: Map<string, AvailabilityStatus>,
  reasonByStatus?: Partial<Record<"blocked" | "maintenance", string | null>>,
): Omit<AvailabilityRange, "id">[] {
  const entries = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  const out: Omit<AvailabilityRange, "id">[] = [];
  let i = 0;
  while (i < entries.length) {
    const [start, status] = entries[i]!;
    let end = start;
    let j = i + 1;
    while (j < entries.length && entries[j]![1] === status) {
      const prev = parseYmd(end);
      const next = parseYmd(entries[j]![0]);
      prev.setDate(prev.getDate() + 1);
      if (toLocalYmd(prev) === entries[j]![0]) {
        end = entries[j]![0];
        j++;
      } else {
        break;
      }
    }
    out.push({
      start_date: start,
      end_date: end,
      status,
      reason: reasonByStatus?.[status as "blocked" | "maintenance"] ?? null,
    });
    i = j;
  }
  return out;
}

export function groupContiguousSorted(ymds: string[]): { start: string; end: string }[] {
  if (ymds.length === 0) return [];
  const sorted = [...ymds].sort();
  const groups: { start: string; end: string }[] = [];
  let start = sorted[0]!;
  let end = start;
  for (let i = 1; i < sorted.length; i++) {
    const ymd = sorted[i]!;
    const nextOfEnd = parseYmd(end);
    nextOfEnd.setDate(nextOfEnd.getDate() + 1);
    if (toLocalYmd(nextOfEnd) === ymd) {
      end = ymd;
    } else {
      groups.push({ start, end });
      start = ymd;
      end = ymd;
    }
  }
  groups.push({ start, end });
  return groups;
}

export function isPastYmd(ymd: string, todayYmd: string): boolean {
  return ymd < todayYmd;
}
