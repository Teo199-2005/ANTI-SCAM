/** Local-date ISO string (YYYY-MM-DD) at noon — avoids DST edge cases. */
export function todayIsoLocal(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Default 1-night stay starting tomorrow (matches public resort room booking flow). */
export function defaultPublicStayDates(): { checkIn: string; checkOut: string } {
  const checkIn = addDaysIso(todayIsoLocal(), 1);
  const checkOut = addDaysIso(checkIn, 1);
  return { checkIn, checkOut };
}

/** Public marketing checkout URL (`/resorts/[id]/checkout`). */
export function buildResortCheckoutHref(
  resortId: number,
  roomId: number,
  checkIn: string,
  checkOut: string,
): string {
  const q = new URLSearchParams({
    roomId: String(roomId),
    checkIn,
    checkOut,
    resortId: String(resortId),
  });
  return `/resorts/${resortId}/checkout?${q.toString()}`;
}
